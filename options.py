import requests
import time
import asyncio
import json
import math
import collections
import traceback
from datetime import datetime

# ================= BINANCE OPTIONS (EAPI) =================
# Public market-data endpoints, no API key required. Confirmed live:
#   /eapi/v1/exchangeInfo -> all option contracts (symbol, side, strike, expiry)
#   /eapi/v1/index?underlying=X -> spot/index price
#   /eapi/v1/mark          -> ALL contracts' mark price + greeks + riskFreeInterest in one call
#   /eapi/v1/ticker        -> ALL contracts' real bid/ask in one call
EAPI_BASE = "https://eapi.binance.com"
UNDERLYINGS = ["BTCUSDT", "ETHUSDT"]
POLL_INTERVAL_SECONDS = 5
EXCHANGE_INFO_REFRESH_SECONDS = 300  # contract list rarely changes intraday

YEAR_MS = 365 * 24 * 3600 * 1000

# ================= PERSISTENT ENGINE STATE =================
# Lives in this process, not in any one browser tab — mirrors sf.py's
# pattern. Only resets on an actual server restart.
OPTIONS_STARTED_AT = time.time() * 1000

EVENTS_HISTORY_LIMIT = 300
CYCLE_DURATION_WINDOW = 20

# Configurable via the frontend settings panel (sent over /ws/options).
settings = {
    "fee_percent": 0.05,     # flat estimated round-trip fee, % of combined leg notional
    "min_profit_usd": 5.0,   # minimum flagged edge after fees, in USDT
}

events_history = collections.deque(maxlen=EVENTS_HISTORY_LIMIT)
cycle_durations = collections.deque(maxlen=CYCLE_DURATION_WINDOW)

# "BTC"/"ETH" -> market panel snapshot (left panel)
market_state = {}

# scanner id -> status snapshot (center panel cards)
scanner_status = {
    "core": {"status": "scanning", "contracts_scanned": 0, "last_scan_time": None, "opportunities_count": 0},
    "box": {"status": "scanning", "contracts_scanned": 0, "last_scan_time": None, "opportunities_count": 0},
    "synthetic": {"status": "scanning", "contracts_scanned": 0, "last_scan_time": None, "opportunities_count": 0},
    "chain": {"status": "scanning", "contracts_scanned": 0, "last_scan_time": None, "opportunities_count": 0},
}

_opportunity_counter = 0
_exchange_info_cache = {"data": None, "loaded_at": 0.0}


# ================= WEBSOCKET BROADCAST =================
# Mirrors scanner.py / sf.py's pattern so all three engines share one app.

clients = []
main_loop = None


async def broadcast_opportunity(payload):
    dead_clients = []

    for ws in clients:
        try:
            await ws.send_json(payload)
        except Exception:
            dead_clients.append(ws)

    for ws in dead_clients:
        if ws in clients:
            clients.remove(ws)


def send_opportunity(payload):
    if main_loop is None:
        return

    asyncio.run_coroutine_threadsafe(
        broadcast_opportunity(payload),
        main_loop
    )


async def handle_client_message(websocket, raw_message):
    try:
        payload = json.loads(raw_message)
    except ValueError:
        return

    if payload.get("type") != "settings":
        return

    if "fee_percent" in payload:
        settings["fee_percent"] = max(0, float(payload["fee_percent"]))

    if "min_profit_usd" in payload:
        settings["min_profit_usd"] = max(0, float(payload["min_profit_usd"]))

    await broadcast_opportunity({"type": "settings", **settings})


# ================= BINANCE API =================

def get_exchange_info():
    now = time.time()

    if (
        _exchange_info_cache["data"] is not None
        and now - _exchange_info_cache["loaded_at"] < EXCHANGE_INFO_REFRESH_SECONDS
    ):
        return _exchange_info_cache["data"]

    response = requests.get(f"{EAPI_BASE}/eapi/v1/exchangeInfo", timeout=10)
    data = response.json()

    if not isinstance(data, dict):
        raise RuntimeError(f"Binance exchangeInfo returned unexpected payload (HTTP {response.status_code}): {data}")

    symbols = data.get("optionSymbols", [])

    if not symbols:
        raise RuntimeError(f"Binance options exchangeInfo returned no symbols: {data}")

    _exchange_info_cache["data"] = symbols
    _exchange_info_cache["loaded_at"] = now

    return symbols


def get_index_price(underlying):
    response = requests.get(f"{EAPI_BASE}/eapi/v1/index", params={"underlying": underlying}, timeout=5)
    data = response.json()

    if not isinstance(data, dict) or "indexPrice" not in data:
        raise RuntimeError(f"Binance index price returned unexpected payload (HTTP {response.status_code}): {data}")

    return float(data["indexPrice"])


def _get_list_keyed_by_symbol(path, timeout=10):
    """GET a Binance options endpoint expected to return a JSON array, keyed
    by contract symbol. Binance occasionally returns an error object (e.g.
    under rate-limit backoff) instead of the array — validated explicitly
    here so that shows up as a clear, loggable error instead of a confusing
    low-level TypeError deep inside a dict comprehension."""
    response = requests.get(f"{EAPI_BASE}{path}", timeout=timeout)
    data = response.json()

    if not isinstance(data, list):
        raise RuntimeError(f"Binance {path} returned unexpected payload (HTTP {response.status_code}): {data}")

    return {item["symbol"]: item for item in data}


def get_all_mark_prices():
    return _get_list_keyed_by_symbol("/eapi/v1/mark")


def get_all_tickers():
    return _get_list_keyed_by_symbol("/eapi/v1/ticker")


# ================= CHAIN BUILDER =================
# Single join point every detector consumes — exchangeInfo (contract specs)
# + index (spot) + mark (theoretical price, greeks, risk-free rate) +
# ticker (real tradeable bid/ask), joined once per cycle per underlying.

def build_chain(underlying, exchange_info, index_price, marks, tickers):
    contracts = {}
    by_expiry = collections.defaultdict(lambda: collections.defaultdict(dict))
    now_ms = time.time() * 1000

    for sym in exchange_info:
        if sym.get("underlying") != underlying or sym.get("status") != "TRADING":
            continue

        symbol = sym["symbol"]
        mark = marks.get(symbol)
        ticker = tickers.get(symbol)

        if mark is None:
            continue

        try:
            mark_price = float(mark.get("markPrice") or 0)
            r = float(mark.get("riskFreeInterest") or 0)
        except (TypeError, ValueError):
            continue

        if mark_price <= 0:
            continue

        ticker_bid = ticker_ask = 0.0

        if ticker is not None:
            try:
                ticker_bid = float(ticker.get("bidPrice") or 0)
                ticker_ask = float(ticker.get("askPrice") or 0)
            except (TypeError, ValueError):
                ticker_bid = ticker_ask = 0.0

        expiry = sym["expiryDate"]
        strike = float(sym["strikePrice"])
        side = "C" if sym["side"] == "CALL" else "P"
        T = max((expiry - now_ms) / YEAR_MS, 1e-6)

        # `mark` (Binance's own maintained fair-value estimate, smoothed
        # across its IV surface) is used for ALL detection math below.
        # `ticker_bid`/`ticker_ask` are the raw order book and are kept
        # separately, used only where a detector needs a real executable
        # price (box spreads, butterflies) — most far-strike/far-date
        # contracts here trade rarely, so their ticker quotes are often
        # stale leftover resting orders miles from fair value (e.g. a
        # $78,877 put with a raw bid of $5), not a genuine two-sided
        # market. Blending stale ticker quotes into a "mid" price produced
        # spurious five-figure false-positive "arbitrage" during testing —
        # see has_tradeable_quote() below for how execution-price legs are
        # sanity-gated against mark before being trusted.
        contract = {
            "symbol": symbol, "side": side, "strike": strike, "expiry": expiry,
            "mark": mark_price, "ticker_bid": ticker_bid, "ticker_ask": ticker_ask,
            "r": r, "T": T,
        }

        contracts[symbol] = contract
        by_expiry[expiry][strike][side] = contract

    return {
        "underlying": underlying,
        "spot": index_price,
        "contracts": contracts,
        "by_expiry": by_expiry,
        "expiries": sorted(by_expiry.keys()),
    }


# ================= SHARED HELPERS =================

def estimate_fee(*leg_notionals):
    """Flat percentage fee applied to the sum of leg notionals, a simplified
    stand-in for Binance's real options fee schedule (which is tiered and
    capped as a fraction of premium)."""
    return sum(leg_notionals) * (settings["fee_percent"] / 100)


def has_tradeable_quote(bid, ask, mark, max_deviation=0.5):
    """True only if both sides of the raw ticker book are present, properly
    ordered, and within a sane band of Binance's own mark price. Rejects
    stale/decorative resting orders (e.g. a leftover bid at $5 on a $78,877
    option) that are technically nonzero but not a real market — using
    those for an execution-cost calculation would produce a fake edge."""
    if bid <= 0 or ask <= 0 or mark <= 0 or bid > ask:
        return False

    lower, upper = mark * (1 - max_deviation), mark * (1 + max_deviation)
    return lower <= bid <= upper and lower <= ask <= upper


def make_opportunity(scanner, algorithm, underlying, strikes, expiries, formula, inputs,
                      calculation, mispricing, expected_profit, roi_percent, suggested_trade,
                      confidence="medium"):
    global _opportunity_counter
    _opportunity_counter += 1
    now = datetime.now()

    return {
        "type": "opportunity",
        "id": f"{scanner}-{underlying}-{int(now.timestamp() * 1000)}-{_opportunity_counter}",
        "scanner": scanner,
        "algorithm": algorithm,
        "underlying": underlying[:-4] if underlying.endswith("USDT") else underlying,
        "strikes": strikes,
        "expiries": expiries,
        "time": now.strftime("%H:%M:%S"),
        "detected_at": now.timestamp() * 1000,
        "formula": formula,
        "inputs": inputs,
        "calculation": calculation,
        "mispricing": round(mispricing, 4),
        "expected_profit": round(expected_profit, 4),
        "roi_percent": round(roi_percent, 3),
        "confidence": confidence,
        "suggested_trade": suggested_trade,
    }


# ================= SCANNER 1: CORE ARBITRAGE (Put-Call Parity) =================

def scan_put_call_parity(chain):
    opportunities = []
    contracts_scanned = 0
    underlying = chain["underlying"]
    S = chain["spot"]

    for expiry, strikes in chain["by_expiry"].items():
        for K, sides in strikes.items():
            call, put = sides.get("C"), sides.get("P")

            if not call or not put:
                continue

            contracts_scanned += 2
            r = (call["r"] + put["r"]) / 2
            T = call["T"]
            discounted_K = K * math.exp(-r * T)

            lhs = call["mark"] - put["mark"]
            rhs = S - discounted_K
            error = lhs - rhs

            fee = estimate_fee(call["mark"], put["mark"], S)
            edge = abs(error) - fee

            if edge <= settings["min_profit_usd"]:
                continue

            quoted = (
                has_tradeable_quote(call["ticker_bid"], call["ticker_ask"], call["mark"])
                and has_tradeable_quote(put["ticker_bid"], put["ticker_ask"], put["mark"])
            )

            if error > 0:
                trade = f"Sell {call['symbol']} (call overpriced), buy {put['symbol']}, buy {underlying[:-4]} spot"
            else:
                trade = f"Buy {call['symbol']} (call underpriced), sell {put['symbol']}, short {underlying[:-4]} spot"

            opportunities.append(make_opportunity(
                scanner="core", algorithm="Put-Call Parity", underlying=underlying,
                strikes=[K], expiries=[expiry],
                formula="C - P = S - K*e^(-rT)",
                inputs={"C": round(call["mark"], 3), "P": round(put["mark"], 3), "S": round(S, 2),
                        "K": K, "r": round(r, 4), "T": round(T, 4)},
                calculation=f"C-P = {lhs:.3f}  vs  S-Ke^(-rT) = {rhs:.3f}  ->  error = {error:.3f}",
                mispricing=error, expected_profit=edge, roi_percent=(edge / max(S, 1)) * 100,
                suggested_trade=trade,
                confidence="high" if quoted and edge > fee * 3 else ("medium" if edge > fee * 3 else "low"),
            ))

    return opportunities, contracts_scanned


# ================= SCANNER 2: BOX SPREAD =================

def scan_box_spread(chain):
    opportunities = []
    contracts_scanned = 0
    underlying = chain["underlying"]

    for expiry, strikes in chain["by_expiry"].items():
        # A box spread needs four real, executable legs — only consider
        # strikes where both the call and put have a genuine two-sided
        # market (not a stale resting quote), since long_cost/short_proceeds
        # below are real money you'd actually pay/receive.
        valid_strikes = sorted(
            k for k in strikes
            if "C" in strikes[k] and "P" in strikes[k]
            and has_tradeable_quote(strikes[k]["C"]["ticker_bid"], strikes[k]["C"]["ticker_ask"], strikes[k]["C"]["mark"])
            and has_tradeable_quote(strikes[k]["P"]["ticker_bid"], strikes[k]["P"]["ticker_ask"], strikes[k]["P"]["mark"])
        )
        contracts_scanned += len(valid_strikes) * 2

        for i in range(len(valid_strikes)):
            for j in range(i + 1, len(valid_strikes)):
                K1, K2 = valid_strikes[i], valid_strikes[j]
                c1, p1 = strikes[K1]["C"], strikes[K1]["P"]
                c2, p2 = strikes[K2]["C"], strikes[K2]["P"]

                r = (c1["r"] + p1["r"] + c2["r"] + p2["r"]) / 4
                T = c1["T"]
                theoretical = (K2 - K1) * math.exp(-r * T)
                fee = estimate_fee(c1["mark"], c2["mark"], p1["mark"], p2["mark"])

                long_cost = (c1["ticker_ask"] - c2["ticker_bid"]) + (p2["ticker_ask"] - p1["ticker_bid"])
                short_proceeds = (c1["ticker_bid"] - c2["ticker_ask"]) + (p2["ticker_bid"] - p1["ticker_ask"])

                long_edge = theoretical - long_cost - fee
                short_edge = short_proceeds - theoretical - fee

                if long_edge > settings["min_profit_usd"]:
                    opportunities.append(make_opportunity(
                        scanner="box", algorithm="Long Box", underlying=underlying,
                        strikes=[K1, K2], expiries=[expiry],
                        formula="Box Price = (K2 - K1)e^(-rT)",
                        inputs={"K1": K1, "K2": K2, "r": round(r, 4), "T": round(T, 4)},
                        calculation=f"theoretical {theoretical:.3f}  vs  long-box market cost {long_cost:.3f}",
                        mispricing=theoretical - long_cost, expected_profit=long_edge,
                        roi_percent=(long_edge / max(long_cost, 1)) * 100,
                        suggested_trade=(
                            f"Buy {c1['symbol']}, sell {c2['symbol']}, "
                            f"buy {p2['symbol']}, sell {p1['symbol']}"
                        ),
                        confidence="high" if long_edge > fee * 3 else "medium",
                    ))
                elif short_edge > settings["min_profit_usd"]:
                    opportunities.append(make_opportunity(
                        scanner="box", algorithm="Short Box", underlying=underlying,
                        strikes=[K1, K2], expiries=[expiry],
                        formula="Box Price = (K2 - K1)e^(-rT)",
                        inputs={"K1": K1, "K2": K2, "r": round(r, 4), "T": round(T, 4)},
                        calculation=f"short-box market proceeds {short_proceeds:.3f}  vs  theoretical {theoretical:.3f}",
                        mispricing=short_proceeds - theoretical, expected_profit=short_edge,
                        roi_percent=(short_edge / max(theoretical, 1)) * 100,
                        suggested_trade=(
                            f"Sell {c1['symbol']}, buy {c2['symbol']}, "
                            f"sell {p2['symbol']}, buy {p1['symbol']}"
                        ),
                        confidence="high" if short_edge > fee * 3 else "medium",
                    ))

    return opportunities, contracts_scanned


# ================= SCANNER 3: SYNTHETIC ARBITRAGE (Conversion / Reversal) =================
# Mathematically the same no-arbitrage relationship as put-call parity
# (S_synth = C - P + Ke^(-rT) is the rearranged parity equation) — presented
# through a different lens than Scanner 1: aggregated across every strike in
# an expiry to surface the single best synthetic-vs-spot trade per expiry,
# rather than re-listing every strike's parity error a second time.

def scan_synthetic(chain):
    opportunities = []
    contracts_scanned = 0
    underlying = chain["underlying"]
    S = chain["spot"]

    for expiry, strikes in chain["by_expiry"].items():
        best = None

        for K, sides in strikes.items():
            call, put = sides.get("C"), sides.get("P")

            if not call or not put:
                continue

            contracts_scanned += 2
            r = (call["r"] + put["r"]) / 2
            T = call["T"]
            synthetic_spot = call["mark"] - put["mark"] + K * math.exp(-r * T)
            error = synthetic_spot - S

            if best is None or abs(error) > abs(best["error"]):
                best = {"K": K, "call": call, "put": put, "T": T, "error": error, "r": r}

        if best is None:
            continue

        K, call, put, T, error, r = best["K"], best["call"], best["put"], best["T"], best["error"], best["r"]
        fee = estimate_fee(call["mark"], put["mark"], S)
        edge = abs(error) - fee

        if edge <= settings["min_profit_usd"]:
            continue

        quoted = (
            has_tradeable_quote(call["ticker_bid"], call["ticker_ask"], call["mark"])
            and has_tradeable_quote(put["ticker_bid"], put["ticker_ask"], put["mark"])
        )

        if error > 0:
            algorithm = "Conversion"
            trade = (
                f"Synthetic spot overpriced by options market: sell {call['symbol']}, "
                f"buy {put['symbol']}, buy {underlying[:-4]} spot (Conversion)"
            )
        else:
            algorithm = "Reverse Conversion"
            trade = (
                f"Synthetic spot underpriced by options market: buy {call['symbol']}, "
                f"sell {put['symbol']}, short {underlying[:-4]} spot (Reversal)"
            )

        opportunities.append(make_opportunity(
            scanner="synthetic", algorithm=algorithm, underlying=underlying,
            strikes=[K], expiries=[expiry],
            formula="Synthetic Spot = C - P + K*e^(-rT)",
            inputs={"C": round(call["mark"], 3), "P": round(put["mark"], 3), "K": K,
                    "S": round(S, 2), "r": round(r, 4), "T": round(T, 4)},
            calculation=f"synthetic spot {S + error:.2f}  vs  actual spot {S:.2f}  ->  error = {error:.3f}",
            mispricing=error, expected_profit=edge, roi_percent=(edge / max(S, 1)) * 100,
            suggested_trade=trade,
            confidence="high" if quoted and edge > fee * 3 else ("medium" if edge > fee * 3 else "low"),
        ))

    return opportunities, contracts_scanned


# ================= SCANNER 4: OPTION CHAIN ANALYSIS =================
# Convexity, Butterfly Arbitrage, Calendar Arbitrage, Pricing Bounds.

def scan_chain_analysis(chain):
    opportunities = []
    contracts_scanned = 0
    underlying = chain["underlying"]
    S = chain["spot"]

    # --- Convexity + Butterfly: 3 consecutive strikes, same side, same expiry ---
    for expiry, strikes in chain["by_expiry"].items():
        for side in ("C", "P"):
            side_strikes = sorted(k for k in strikes if side in strikes[k])

            for i in range(len(side_strikes) - 2):
                K1, K2, K3 = side_strikes[i], side_strikes[i + 1], side_strikes[i + 2]

                if K3 == K1:
                    continue

                c1, c2, c3 = strikes[K1][side], strikes[K2][side], strikes[K3][side]
                contracts_scanned += 1

                # Convexity: price must not exceed the strike-weighted average
                # of its neighbors. w generalizes the equal-spacing "midpoint
                # average" to unequal strike gaps.
                w = (K3 - K2) / (K3 - K1)
                bound = w * c1["mark"] + (1 - w) * c3["mark"]
                violation = c2["mark"] - bound
                fee = estimate_fee(c1["mark"], c2["mark"], c3["mark"])
                edge = violation - fee

                if edge > settings["min_profit_usd"]:
                    quoted = all(
                        has_tradeable_quote(c["ticker_bid"], c["ticker_ask"], c["mark"])
                        for c in (c1, c2, c3)
                    )

                    opportunities.append(make_opportunity(
                        scanner="chain", algorithm="Convexity", underlying=underlying,
                        strikes=[K1, K2, K3], expiries=[expiry],
                        formula="C(K2) <= w*C(K1) + (1-w)*C(K3),  w = (K3-K2)/(K3-K1)",
                        inputs={"K1": K1, "K2": K2, "K3": K3, "side": side, "w": round(w, 4)},
                        calculation=f"C(K2) = {c2['mark']:.3f}  vs  bound = {bound:.3f}",
                        mispricing=violation, expected_profit=edge,
                        roi_percent=(edge / max(c2["mark"], 1)) * 100,
                        suggested_trade=(
                            f"Sell {c2['symbol']}, buy {c1['symbol']} and {c3['symbol']} "
                            f"(weighted {w:.2f}/{1 - w:.2f}) — convexity violation"
                        ),
                        confidence="high" if quoted and edge > fee * 3 else ("medium" if edge > fee * 3 else "low"),
                    ))

                # Butterfly Arbitrage: the tradeable structure, equally-spaced
                # strikes only, and only when all three legs have a real
                # two-sided market (net_cost below is real executable money).
                if abs((K2 - K1) - (K3 - K2)) < 1e-9 and all(
                    has_tradeable_quote(c["ticker_bid"], c["ticker_ask"], c["mark"])
                    for c in (c1, c2, c3)
                ):
                    net_cost = (c1["ticker_ask"] + c3["ticker_ask"]) - 2 * c2["ticker_bid"]
                    bf_fee = estimate_fee(c1["mark"], c2["mark"], c3["mark"])
                    bf_edge = -net_cost - bf_fee

                    if bf_edge > settings["min_profit_usd"]:
                        opportunities.append(make_opportunity(
                            scanner="chain", algorithm="Butterfly Arbitrage", underlying=underlying,
                            strikes=[K1, K2, K3], expiries=[expiry],
                            formula="Butterfly cost = C(K1) + C(K3) - 2*C(K2) >= 0",
                            inputs={"K1": K1, "K2": K2, "K3": K3, "side": side},
                            calculation=f"net cost to open = {net_cost:.3f} (negative = a credit received)",
                            mispricing=-net_cost, expected_profit=bf_edge,
                            roi_percent=(bf_edge / max(abs(net_cost), 1)) * 100,
                            suggested_trade=(
                                f"Buy {c1['symbol']}, sell 2x {c2['symbol']}, buy {c3['symbol']} "
                                f"(long butterfly opens for a net credit)"
                            ),
                            confidence="high",
                        ))

    # --- Calendar Arbitrage: calls only, same strike, consecutive expiries ---
    # Restricted to calls: the "front-month can't be worth more than
    # back-month" proof relies on the discounted lower bound dominating the
    # front option's payoff, which only holds for calls on a non-dividend
    # asset. The same argument does not hold for puts when r>0 (the
    # discounted put bound sits *below* intrinsic value, not above it), so a
    # symmetric check on puts would false-positive on real ITM puts.
    all_strikes = set(k for strikes in chain["by_expiry"].values() for k in strikes)

    for K in all_strikes:
        expiries_with_call = sorted(
            expiry for expiry, strikes in chain["by_expiry"].items()
            if K in strikes and "C" in strikes[K]
        )

        for i in range(len(expiries_with_call) - 1):
            e1, e2 = expiries_with_call[i], expiries_with_call[i + 1]
            front = chain["by_expiry"][e1][K]["C"]
            back = chain["by_expiry"][e2][K]["C"]
            contracts_scanned += 2

            violation = front["mark"] - back["mark"]
            fee = estimate_fee(front["mark"], back["mark"])
            edge = violation - fee

            if edge > settings["min_profit_usd"]:
                quoted = (
                    has_tradeable_quote(front["ticker_bid"], front["ticker_ask"], front["mark"])
                    and has_tradeable_quote(back["ticker_bid"], back["ticker_ask"], back["mark"])
                )

                opportunities.append(make_opportunity(
                    scanner="chain", algorithm="Calendar Arbitrage", underlying=underlying,
                    strikes=[K], expiries=[e1, e2],
                    formula="Front-month call price must not exceed back-month (same strike)",
                    inputs={"K": K, "front_mark": round(front["mark"], 3), "back_mark": round(back["mark"], 3)},
                    calculation=f"front {front['mark']:.3f}  >  back {back['mark']:.3f}",
                    mispricing=violation, expected_profit=edge,
                    roi_percent=(edge / max(back["mark"], 1)) * 100,
                    suggested_trade=f"Sell {front['symbol']}, buy {back['symbol']} (calendar spread)",
                    confidence="high" if quoted and edge > fee * 3 else ("medium" if edge > fee * 3 else "low"),
                ))

    # --- Pricing Bounds: per-contract lower/upper/intrinsic checks ---
    for expiry, strikes in chain["by_expiry"].items():
        for K, sides in strikes.items():
            for side, contract in sides.items():
                contracts_scanned += 1
                r, T, mark = contract["r"], contract["T"], contract["mark"]
                discounted_K = K * math.exp(-r * T)
                fee = estimate_fee(mark)
                quoted = has_tradeable_quote(contract["ticker_bid"], contract["ticker_ask"], mark)

                if side == "C":
                    lower, upper = max(0.0, S - discounted_K), S
                    intrinsic = max(0.0, S - K)
                    lower_formula = "Call lower bound: max(0, S - K*e^(-rT)) <= C"
                    upper_formula = "Call upper bound: C <= S"
                else:
                    lower, upper = max(0.0, discounted_K - S), discounted_K
                    intrinsic = max(0.0, K - S)
                    lower_formula = "Put lower bound: max(0, K*e^(-rT) - S) <= P"
                    upper_formula = "Put upper bound: P <= K*e^(-rT)"

                lower_edge = lower - mark - fee
                upper_edge = mark - upper - fee
                intrinsic_edge = intrinsic - mark - fee
                confidence = "high" if quoted else "medium"

                if lower_edge > settings["min_profit_usd"]:
                    opportunities.append(make_opportunity(
                        scanner="chain", algorithm="Pricing Bounds", underlying=underlying,
                        strikes=[K], expiries=[expiry],
                        formula=lower_formula,
                        inputs={"K": K, "S": round(S, 2), "r": round(r, 4), "T": round(T, 4), "market_price": round(mark, 3)},
                        calculation=f"market {mark:.3f}  <  lower bound {lower:.3f}",
                        mispricing=lower - mark, expected_profit=lower_edge,
                        roi_percent=(lower_edge / max(mark, 1)) * 100,
                        suggested_trade=f"Buy {contract['symbol']} (priced below its no-arbitrage floor)",
                        confidence=confidence,
                    ))
                elif upper_edge > settings["min_profit_usd"]:
                    opportunities.append(make_opportunity(
                        scanner="chain", algorithm="Pricing Bounds", underlying=underlying,
                        strikes=[K], expiries=[expiry],
                        formula=upper_formula,
                        inputs={"K": K, "S": round(S, 2), "r": round(r, 4), "T": round(T, 4), "market_price": round(mark, 3)},
                        calculation=f"market {mark:.3f}  >  upper bound {upper:.3f}",
                        mispricing=mark - upper, expected_profit=upper_edge,
                        roi_percent=(upper_edge / max(mark, 1)) * 100,
                        suggested_trade=f"Sell {contract['symbol']} (priced above its no-arbitrage ceiling)",
                        confidence=confidence,
                    ))
                elif side == "C" and intrinsic_edge > settings["min_profit_usd"]:
                    # Calls only. For calls, Ke^(-rT) <= K means the
                    # discounted lower bound is always >= intrinsic, so this
                    # is strictly weaker than (implied by) the discounted
                    # bound check above — kept as its own labeled category
                    # since the spec calls it out distinctly. For PUTS the
                    # inequality flips: Ke^(-rT)-S <= K-S, so a European
                    # put's fair value legitimately sitting below its
                    # undiscounted intrinsic value is normal (no early
                    # exercise is possible), not a violation — applying this
                    # check to puts produced false positives on real deep-ITM
                    # contracts during testing (e.g. a put correctly priced
                    # at $78,883 with $79,968 of undiscounted intrinsic value
                    # was flagged as a "violation" purely from the discount).
                    opportunities.append(make_opportunity(
                        scanner="chain", algorithm="Pricing Bounds", underlying=underlying,
                        strikes=[K], expiries=[expiry],
                        formula="Intrinsic value floor: price >= max(0, exercise value)",
                        inputs={"K": K, "S": round(S, 2), "market_price": round(mark, 3), "intrinsic": round(intrinsic, 3)},
                        calculation=f"market {mark:.3f}  <  intrinsic value {intrinsic:.3f}",
                        mispricing=intrinsic - mark, expected_profit=intrinsic_edge,
                        roi_percent=(intrinsic_edge / max(mark, 1)) * 100,
                        suggested_trade=f"Buy {contract['symbol']} (priced below intrinsic/exercise value)",
                        confidence=confidence,
                    ))

    return opportunities, contracts_scanned


SCANNERS = [
    ("core", scan_put_call_parity),
    ("box", scan_box_spread),
    ("synthetic", scan_synthetic),
    ("chain", scan_chain_analysis),
]


# ================= RUN LOOP =================

def run_forever():
    print("[options] Starting Options Arbitrage Scanner...")

    while True:
        cycle_start = time.time()

        try:
            exchange_info = get_exchange_info()
            marks = get_all_mark_prices()
            tickers = get_all_tickers()
        except Exception as error:
            print("[options] Failed to load base market data, retrying:", error)
            traceback.print_exc()
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        opportunities_this_cycle = collections.defaultdict(list)
        contracts_scanned_this_cycle = collections.defaultdict(int)

        for underlying in UNDERLYINGS:
            try:
                index_price = get_index_price(underlying)
                chain = build_chain(underlying, exchange_info, index_price, marks, tickers)
            except Exception as error:
                print(f"[options] Failed to build chain for {underlying}:", error)
                continue

            short_name = underlying[:-4]
            calls = sum(1 for c in chain["contracts"].values() if c["side"] == "C")
            puts = sum(1 for c in chain["contracts"].values() if c["side"] == "P")
            strikes_count = len(set(c["strike"] for c in chain["contracts"].values()))

            market_state[short_name] = {
                "spot": index_price,
                "expiries_count": len(chain["expiries"]),
                "contracts_count": len(chain["contracts"]),
                "strikes_count": strikes_count,
                "calls_count": calls,
                "puts_count": puts,
                "last_update": datetime.now().strftime("%H:%M:%S"),
            }

            for scanner_id, scan_fn in SCANNERS:
                try:
                    found, scanned = scan_fn(chain)
                    opportunities_this_cycle[scanner_id].extend(found)
                    contracts_scanned_this_cycle[scanner_id] += scanned
                except Exception as error:
                    print(f"[options] Scanner '{scanner_id}' failed for {underlying}:", error)

        now_str = datetime.now().strftime("%H:%M:%S")
        all_new_opportunities = []

        for scanner_id, _ in SCANNERS:
            found = opportunities_this_cycle[scanner_id]
            scanner_status[scanner_id]["last_scan_time"] = now_str
            scanner_status[scanner_id]["contracts_scanned"] = contracts_scanned_this_cycle[scanner_id]
            scanner_status[scanner_id]["opportunities_count"] += len(found)
            scanner_status[scanner_id]["status"] = "opportunity" if found else "no_opportunity"
            all_new_opportunities.extend(found)

        for opportunity in all_new_opportunities:
            events_history.append(opportunity)
            send_opportunity(opportunity)

        cycle_duration_ms = (time.time() - cycle_start) * 1000
        cycle_durations.append(cycle_duration_ms)

        send_opportunity({
            "type": "status",
            "time": now_str,
            "market": dict(market_state),
            "scanners": {k: dict(v) for k, v in scanner_status.items()},
            "performance": {
                "contracts_scanned_total": sum(contracts_scanned_this_cycle.values()),
                "scans_per_sec": round(1000 / max(cycle_duration_ms, 1), 3),
                "avg_scan_time_ms": round(sum(cycle_durations) / len(cycle_durations), 1),
                "last_update": now_str,
            },
        })

        elapsed = time.time() - cycle_start
        time.sleep(max(POLL_INTERVAL_SECONDS - elapsed, 0.5))
