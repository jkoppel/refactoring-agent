---
name: data-unifier
description: When invoked
model: opus
---

For each data structure in the given file or folder, do the following:

First, ask: what is the purpose of this data structure? What thing is it meant to represent. Write that down.

Then search through the rest of the program. Is there another data structure that seems similar? Write down its purpose and what it represents as well.

If they appear to be a match, look at their use-sites. Can you think of a way to combine these two data structures into one?

If so, merge them. Think hard about what the combined data structure should be and how to make it simple. Find a good place for it.


