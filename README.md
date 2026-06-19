# Live Demo

[Click for Online Demo](https://dashboard.d3px1xkakdd95h.amplifyapp.com/)

# The Goal

To show the practical performance, accuracy and reliability of different LLMs and different agentic development patterns.  I plan to go through vibe coding, spec driven development, steering files impact and finally semi-autonomous chained agents development. 

I also want to show metrics on code drift, rate of bugs, and ease of new features & maintainability.  

# Starting prompt

Create a solitaire style mobile responsive web app using React/Vite/MUI components. Instead of a classic playing cards deck, we have a card deck that has several different categories. Make the code modular to easily substitute in new decks, using a clean JSON array for the deck data that separates `id`, `categoryTitle`, and `itemName` so it is easily swappable. 

At the top is the source deck of cards that deals out one card at a time into a draft pile of cards where the user can pull a card from the top of the draft pile. Cards in the source deck are face down so we can only see the back of the playing cards' generic design. The draft pile of cards is face up. When all cards are used up in the source deck, an empty card slot is shown. If the user clicks on the empty card slot, the cards in the draft pile are flipped over, the order is inverted so that the card on the top of the draft pile is last and the card that was on the bottom of the draft pile is first. The draft pile shows an empty spot again, and the cards are available to draw one at a time again on the source pile. 

Below the source and draft piles are five empty card holder slots (the Foundation). Because there are more categories in the deck than slots, when a category is completed and disappears, that slot becomes empty and receptive to a new category title card. 

Below the five empty card holder slots is the play area (the Tableau). The play area has five columns of cards when the game is started. The first column should have four cards, the second column five cards, the third column six cards, the fourth column seven cards, and the fifth column eight cards. All cards are face down except for the bottom card of each column. Whenever a face-up card is moved from a column, the new bottom card of that column must automatically reveal and flip face-up. 

Only face-up cards can be moved. The card deck consists of category title cards that list the name of the category and how many cards are in that category. The card deck also consists of category item cards; each category item card will have the text of the item that belongs to the category. If a category title card is at the bottom of one of the columns in the play area, it can only be placed into either an empty column in the play area, on top of a category item card of its same category, or it can be placed into one of the empty five card holder slots. Any other move is considered illegal and the card will make an error sound and drag back to where it started. 

Category item cards can only be placed on top of other category item cards of the same category in the play area, or on an empty column in the play area. A correctly stacked sequence of category item cards can be moved together as a single unit to a valid column. In the five empty cardholders area, the player can only drag a category item card to a slot if the same category's category title card already exists in that slot, or on top of a category item card of the same category. All other moves are illegal and will generate a warning noise and bounce back. 

To ensure mobile friendliness, implement both drag-and-drop (using a library like @dnd-kit/core or framer-motion) AND tap-to-move functionality (if a user taps a valid card and then taps a valid destination, the card moves there). 

If a player places a card on top of another face-up card in the play area, all cards remain face up. Use CSS absolute positioning with a calculated `top` offset for stacked cards so they overlap, making a smaller version of the category item text visible at the top of the stacked cards while the bottom card shows the full face. 

When the player puts category item cards into one of the five holder slots above the play area, a counter will show above the card displaying the category title text as well as how many cards have been collected in an "x/y" number format. When all category item cards for its category have been placed in its holder slot, the deck will glitter and then disappear with a success noise, awarding the user 100 points, and freeing up the slot. 

The score should show at the top left of the screen. There should be a basic menu cog option that allows the user to restart the game, quit, or turn off sound. Use the native browser Web Audio API to generate the requested error, warning, and success sound effects procedurally so no external audio files are needed. When all cards from the draw pile and play area have been successfully grouped and cleared, trigger a "Game Over - You Win!" modal with the final score and a button to play again.

Here is an example starter deck configuration. The first level bullet is the category title and the second level bullet is the category item:
 - King
 - - Scepter
 - - Orb
 - - Throne
 - Chimera
 - - Goat
 - - Lion
 - - Snake
 - Ceramic
 - - Vase
 - - Mug
 - - Plate
 - - Tile
 - - Bowl
 - Jupiter
 - - Io
 - - Ganymedes
 - - Callisto
 - - Europa
 - Think
 - - Consider
 - - Suppose
 - - Imagine
 - - Ponder
 - - Suggestion
 - Smell
 - - Nose
 - - Odor
 - - Perfume
 - - Bouquet
 - - Aroma
 - - Scent
 - Winds
 - - Vendavel
 - - Mistral
 - - Bora
 - - Breeze
 - - Piteraq
 - - Chinook
 - - Zephyr
 - - Sirocco
 - Refuge
 - - Den
 - - Hideout
 - - Hideaway
 - - Safety
 - - Lair
 - - Security
 - - Shelter
 - Beds
 - - Bunk
 - - Crib
 - - Cradle
 - - Berth
 - - Sofa bed
 - - Futon
 - - Cot
 - - Hammock
 - Wine
 - - Riesling
 - - Prosecco
 - - Merlot
 - - Cabernet
 - - Rose
 - - Cava
 - Neck
 - - Bowtie
 - - Dress Shirt
 - - Scarf
 - - Tie
 - Pirate
 - - Rum
 - - Pegleg
 - - Treasure
 - - Cannon
 - - Cutlass
 - - Parrot
 - Aviation
 - - Jet
 - - Runway
 - - Flight
 - - Airport
 - - Pilot
 - - Fuselage
 - - Airline
 - - Airship
