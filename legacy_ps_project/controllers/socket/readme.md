# Realtime server for Textäventyr

The basic idea is to enable realtime communications for the Textäventyr application.

There are two big problems to solve:

1. Realtime multiuser editing
Two or more users can simulateously edit an adventure.

2. Realtime multiuser viewing
Two or more users can simultaneously view and play an adventure - and be aware of eachother.

...and a couple of minor problems:

1. Connection resiliance
If a connection is dropped, try reconnecting every 5-10 seconds


# Serverside datastructure

Each adventure has a unique URI which is a 6-character uniuri (alfanumeric w. upper/lowercase).
Each adventure has a set of nodes and links.
In the editor, links and nodes are navigatable.
In the player, only nodes are navigatable as links are simply pathways to other nodes.

## Multiuser editing

Can be done in multiple ways.

1. Simultaneous
If simulatenous editing in a textarea should be supported, operational transform needs to be implemented on the server.
Every change/delta must be sent to the server and the server should determine which deltas are provided to connected users.
Server must keep track of order of changes.

2. Lock-Unlock
If lock-unlock editing is utilized, a node or link is locked for as long as it is focused by a user. If a user disconnects, its automatically unlocked.
This would be simple to create, the server only keeps track of each users currently selected node/link and simply propagates changes to all users subscribing to the current adventure.
This solution would probably be very unstable and errorprone. For example adding new nodes would be very reliant on the quality of the connection.

## Multiuser viewing

Can be done in multiple ways.

1. Basic
Propagate users current node to all other users viewing the current adventure.
This has the effect of being in a group with other people, but brings limited effect to an adventure.

2. Round-based
Create support for limited rounds, where users connect to an active round and only see other users connected to that round.


# Suggested course of action

1. Implement basic multiuser viewing

* [x] Add support for connecting a user to a central user store
* [ ] Add support for subscribing (command) to a topic/adventure
* [ ] Add support for navigation (command) to a topic-element/node
* [ ] Add visualisation support for showing other users in UI
* [ ] Add toasts to show who has connected and disconnected(?)
* [ ] Add support for setting username (command)
* [ ] Add prompt for setting username (client)

2. Round based multiuser viewing

3. Realtime multiuser editing
