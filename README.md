# CS50-Web-Programming with Python and Javascript
## Project 2: Flack - a slack clone

# Objectives:


- Learn to use JavaScript to run code server-side.
- Become more comfortable with building web user interfaces
- Gain experience with Socket.IO to communicate between clients and servers.

# Overview: 

In this project, I built an online messaging service using Flask, similar in spirit to Slack. Users will be able to sign into the site with a display name, create channels (i.e. chatrooms) to communicate in, as well as see and join existing channels. Once a channel is selected, users will be able to send and receive messages with one another in real time. Finally, I added a personal touch to the chat application of my choosing!

# Project Specifications


- **Display Name:** When a user visits the web application for the first time, they should be prompted to type in a display name that will eventually be associated with every message the user sends. If a user closes the page and returns to the app later, the display name should still be remembered.
 - **Channel Creation:** Any user should be able to create a new channel, so long as its name doesn’t conflict with the name of an existing channel.
 - **Channel List:** Users should be able to see a list of all current channels, and selecting one should allow the user to view the channel. 
- **Messages View:** Once a channel is selected, the user should see any messages that have already been sent in that channel, up to a maximum of 100 messages. the app should only store the 100 most recent messages per channel in server-side memory.
- **Sending Messages:** Once in a channel, users should be able to send text messages to others the channel. When a user sends a message, their display name and the timestamp of the message should be associated with the message. All users in the channel should then see the new message (with display name and timestamp) appear on their channel page. Sending and receiving messages should NOT require reloading the page.
- **Remembering the Channel:** If a user is on a channel page, closes the web browser window, and goes back to the web application, the application should remember what channel the user was on previously and take the user back to that channel.
- **Personal Touch:** Add at least one additional feature to the chat application. Possibilities include: **supporting deleting one’s own messages**, supporting use attachments (file uploads) as messages, or **supporting private messaging between two users**.
