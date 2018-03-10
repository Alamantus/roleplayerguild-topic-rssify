# RolePlayerGuild Topic RSSify

This is a tool that's extremely narrow in focus, but could easily be updated to
be a universal tool (and it probably will be someday if I find enough websites
without RSS). It's built to run in Heroku, but you can use it locally or wherever
Node works.

## Installation

Clone the repo and run `yarn`

## Usage

Locally, run `npm start` and go to `http://localhost:5000`. There will be instructions
for how to modify the url to get the RSSified content.

## Explanation

It grabs the content of the topic page, finds the last page (if there is one), and gets
the 10 most recent posts, listed from most to least recent. Using the `/all` endpoint
gets all the posts, looping through every page in the topic to find the posts.
