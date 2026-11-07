# Gengar TCG Prices
Personal PWA showing Pokémon TCG card prices from PriceCharting (eBay / 集换社 not connected yet). Static files only; no secrets. Collection, wishlist, prices you typed, currencies, and filters stay in this phone's localStorage (use Export for backups).

Opening or reopening the app shows the last prices saved on the phone. It does not contact the network for prices or exchange rates. Pull down from the top of the list, or tap **Refresh**, when you have a better connection. If that refresh fails, the prices already on screen stay. An app update (shell, script, or pictures) is separate from a price refresh and does not change saved prices.

This repo does not run a scheduled price update. Leave that off until you explicitly want it again.

- `watchlist.json` – the cards tracked (id, name, set, number, language, PriceCharting url). Only `url` is required for new entries. Publishing `prices.json` fills in the rest. Refresh on the phone downloads that published file; it does not scrape PriceCharting.
- `prices.json` – prices shipped with the site. The phone keeps its own copy until you refresh.
- `history/<id>.json` – monthly history from PriceCharting + one daily snapshot per published refresh. Charts are saved on the phone when you refresh.
- `img/` – card pictures. After they load once they are cached for offline.

The last two cards in that list are Sylveon ex, Chinese CSV9.5C 234/208 SAR (`cn-csv95c-234`), and Cubone, Chinese Gem Pack Vol. 3 0407/07 by Katsunori Sato (`cn-gem3-407`, not the 0401–0406 prints). Their pictures are those exact cards.

## Adding cards
Easiest: tell Grok Bot in chat (or tap "Copy request for Grok Bot" on a pending card). It adds the URL to `watchlist.json` and runs the refresh. You can also edit `watchlist.json` on GitHub yourself. The app's "Add card" saves the card as *pending* on your phone until the next refresh.
