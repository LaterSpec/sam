-- Remove the retired simulated-investing and market-data subsystem.
-- Apply only after deploying application code that no longer references it.

drop table if exists portfolio_snapshots;
drop table if exists trades;
drop table if exists watchlist;
drop table if exists holdings;
drop table if exists market_daily_bars;
drop table if exists market_quotes;
drop table if exists market_symbols;
