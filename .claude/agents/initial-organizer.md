
---
name: initial-organizer
description: When invoked
model: opus
---

**Section files heavily. Section long and/or complicated functions heavily**

Go through each file.  Look at adjacent function and data structure definitions. Ask: what unifying theme do these have? Do they form a natural grouping? Would it be easier to read if you marked them as related?

Do this both at the top level of the file, and within class definitions.

Once you've found some natural groupings, mark them as being in the same section using blocks like this


```tsx
// #######################################
// A large section of similar functionality
// #######################################
```

Come up with an appropriate title for the section.

Next, order the sections. Are there some things that are helper functions that are only tangentially related to the goals of the file, but used in many places? If so, consider putting them in a helpers section near the top — or split the section they're in into subsections, with one subsection for the helpers and another for the main code.

Overall, things that have a more general purpose than the main point of the file should go in sections and subsections towards the top.


Subsections look like this:

```tsx
// ##############################
// A subsection
// ##############################

// ####################
// Sometimes you need a sub-sub-section
// ####################
```

Go through the file again. For each two definitions in the same section, come up with a score for how related they are — 100 if they're closely related, 0 if they're completely unrelated. Your goal is to maximize the average similarity of definitions in the same section. Would reorganizing them help increase the score?

Next, section the bodies of larger functions in a similar way.

If there are existing comments like this within a function.

```
// Initialize the system
initialize_thing1();
initialize_thing2();
initialize_thing3();
```

i.e.: where an ordinary comment actually describes a chunk of code, then replace it with a header comment.

A few more guidelines:

- Types should be defined before they are used.
- Make sure to include a blank line above and below each section header at the top level or within a class, except for those above a group of field or variable definitions.
- Make sure to include a blank line above (but not necessarily below) each section header within a function.

Below are some readings to help you understand sectioning. Note that, in the "Should You Split That File" reading, there are some images you can't see.


# Grouping in Files and Functions

You have a 30-line method. There are chunks that do smaller things. Do you break it up into smaller methods? If you do, then you've properly labeled the subpieces, but added some indirection. If you don't, the reverse holds. Also, breaking it into pieces may result in methods with a lot of parameters.

But you can eat your cake and have it too. I've become a fan of this style of programming, available in any curly-braces language, where you use labeled blocks to group code at a sub-function level.

void initDriver() {
  void *dmaAddress;

  findAddress: {
    // ...
  }

  sendStartupMessage: {
    // ...
  }

  sanityChecks: {
    // ..
  }
}

If you wrote this function by thinking "First find the address, then send startup messages," then labeling these blocks preserves this part of the design process, an instance of the Embedded Design Principle. If you ever do design to break out sub-functions, then there's no need to figure out how; the thinking has already been done. As an added benefit, this style makes it clear which variables are long-lived throughout the function body, and which are only done locally.

A similar idea applies when placing functions in a file. I like to break them into subcategories, with a nice block comment separating them. Here's how it looks in a file implementing an interpreter for a DSL:

/*********** Term definitions *********/

class Expression { .... }

class Statement { .... }

/***** Helpers for creating terms *****/

Expression exprFromString(....) { ... }

/*************** Execution ************/

Value lookupVariable(....} { .... }

Address resolveJumpTarget(...) { ... }

void evalStatement(...) { .... }

/************** Type checking ********/

void checkExpression(...) { ... }

void checkStatement(...) { ... }

Unlike the previous idea, each labeled cluster may not correspond to a distinct design intention. Nonetheless, this helps greatly in quickly digesting what is in a file. And if you ever want to split this file into several, the thinking has been done for you.
 


# Should You Split That File?

You’re a line programmer for EvilCorp, and it’s just an average day working on some code to collapse the economy.


Then you realize you need some code for disrupting supply chains.


Should you split it into a new file?

Let’s say you do.

Pretty soon your directory looks like this:


It’s so well organized! You want to know what it tracks about the robot armies, it’s right there.

Except that all your files look like this:


And the control flow through the files looks like this:


Now you’re starting to regret having broken it up so aggressively.

Now back up a bit.

Let’s say you keep it in one file, at least for now.

Then you need to add some code for supply chain and robot info.


This repeats a few times. If you’re lucky, the file looks like this, where lines of the same color represent related code:


There, we can see related code is mostly together, but there’s some degradation, and a few things don’t fit neatly into any category. Needs some weeding, but overall a decently-kept garden.

If you’re less lucky, it looks more like this:


This is a file where there clearly used to be some structure, but now it’s overgrown with chaos.

Of course, if you don’t have the whole file committed in memory, it looks more like this:


Man, just figuring how it directs the army is a headache. That really should be broken out into its own file. But don’t you wish you had done so earlier?

In nearly all ecosystems, programs consist of files consisting of text. When you break code into more files for more categories, it becomes easier to find and understand code for each category, but harder to read anything involving multiple categories. When you keep code together into fewer files, it becomes easier to track the control flow for individual operations, but harder to form a mental map of the code.

What if I told you that you can eat the cake and have it too?

Here’s how.

## The magic third way

Let’s look at your colleague Tom in the service division of the robotics department. He works on the repair manual that keeps the whole company’s army running smoothly. One day he’s working on the section for how to maintain the mirrors in the laser cannons.


He realizes that he actually wants to add quite a few things about polishing the mirror. You see, the mirrors can only be polished with a custom nanoparticle solution, and so part of maintaining the mirror is really about maintaining the polish. Where to put this information?

Unlike in code, it’s a pretty big deal to “split stuff out into a new file,” since they like to keep everything in one volume for the technicians. Putting it in a new chapter would mean an awful lot of page flipping. And it’s quite messy to just mix in a lot of sections about maintaining the polish into the larger chapter on the laser cannon.


But he has no problem adding them with more organization:


That’s the normal way to organize books, with chapters and subchapters (and sub-subchapters). Or, in HTML: h1, h2, etc.

We have them in code too.

They look like this:

```
/*******************************************************
 **************** h1 in C/C++/Java/JS ******************
 *******************************************************/

/**************
 ********* This is an h2
 **************/


/********
 **** An h3
 ********/
```

Or this:

################ Python/Ruby/Bash H1 ################

############## An H2

##### An H3
Or this:

```
--------------------------------------------------------
--                   Haskell/Lua h1                   --
--------------------------------------------------------


-----------                An h2             -----------


------ An h3
```

Or any of countless other variations. They all get the job done. I tend to like the ones that more visibly break up the text, so: like the first bunch, except translated into whatever language I’m using.

I teach people a lot of things about software design. Some of them are things I dusted off from papers written in the 70’s. Many more I can claim to have invented myself.

This one, not in the slightest. In fact, here’s some CSS guys doing it, in the frontend framework “Semantic UI”:

```
/*******************************
             Types
*******************************/

/*-------------------
       Animated
--------------------*/

.ui.animated.button {
  position: relative;
  overflow: hidden;
  padding-right: 0em !important;
  vertical-align: @animatedVerticalAlign;
  z-index: @animatedZIndex;
}
```


But I can say that I’ve never seen anyone else write about it explicitly, nor take them as far as I do.

“Jimmy,” one listener commented. “At my workplace, I’ve seen a lot of code with these sections, but stuff keeps getting added in the middle, and then the sections become meaningless.”

“Is it too hard to just add a subsection for exactly the stuff added?”

“Actually,” he replied, “I don’t think I’ve ever seen subsections.”

But my code these days has it everywhere. On occasion to three or more levels of organization.


(What in the world is this code doing, just renaming strings? Another deep idea and another discussion. Short version: Trying to get the benefits of having a fancy datatype for identifiers without actually doing any work.)

Aggressively splitting files into sections and (sub-)subsections is the biggest way my code has changed in the last 5 years. It requires little skill, and, once you build the habit, little effort. But I’ve found it makes a huge difference in how pleasant it is to live in a codebase.

Cognitive load and design reconstruction
Hopefully I don’t have to argue too hard that code organized into sections and subsections is nicer to read, if not to write. Here are two versions of a code snippet (source) from Semantic UI: the original, and one with the section dividers removed. Personally, even at a glance, I find the version with them present more inviting.


There are actually some pretty deep reasons why sub-file organization works.

We saw that splitting a file comes with advantages and disadvantages. As does not splitting.

But, actually, for not splitting, all the disadvantages were in reading it.

When you start a new feature, you have some high-level intentions. By some process, you turn the high-level intentions into low-level intentions into code.


But when someone first looks at a file, it’s just a blob.


Then they start to read and build an understanding of each piece.


As they understand more pieces, they can begin to understand how they fit together into a bigger picture.

But all this is wasted work! The reader is just trying to reconstruct knowledge that was already known to the writer!

That’s a very general problem. Anything done to counter it falls under the umbrella of what I call the Embedded Design Principle. Splitting a file into sections is just one particularly effective instance of this broader idea. As poetically explained in The 11 Aspects of Good Code:

Good code makes it easy to recover the intent of the programmer

A programmer dreams a new entity. Her mind gradually turns dream into mechanism, mechanism into code, and the dreamed entity is given life.

A new programmer walks in and sees only code. But in his mind, as he reads and understands, the patterns emerge. In his mind, code shapes itself into mechanism, and mechanism shapes itself into dream. Only then can he work. For in truth, a modification to the code is a modification to the dream.

Much of a programmer's work is in recovering information that was already present in the mind of the creator. It is thus the creator's job to make this as simple as possible.
Back to the robot armies. The reader has started to piece together a bigger picture.


In this example, the code was written in three sections and then not edited. That brings an offer: understand the first three functions, and you understand the big ideas of the mechanics behind sending forth a robot army. Understand the next three, and you understand the bigger picture. But the reader in the picture hasn’t found that structure yet.

Piecing this code together is like a jigsaw puzzle. And in a jigsaw puzzle, if I were to give you a box with only pieces from the left half, and a box with only the pieces from the right half, it would be more than twice as easy.1 That’s a lot like what you’re doing for the reader by labeling code sections.2

There’s one more benefit too. I and many others I showed this to report a sense of relaxation and calm from skimming through a well-sectioned file, a lot like coming home to a clean room. I think what’s going on here is cognitive ease: there’s a psychological phenomenon in which easy things literally cause happiness. There’s an entire chapter on it in Kahnemann’s Thinking Fast and Slow.

Oh, and then there’s also how naming is one of the two hard problems of computer science (the others being cache invalidation and off-by-one errors). If you put two functions that coordinate robots surrounding and invading a factory into a file, then you’re going to want to think of some general name that captures both these and everything similar that should go in the same file. That sounds kinda tough; my best is “offensive_tactics.ts.” But you just cordon these off into a little section of a larger file containing the whole supply-chain disruption logic, then naming that section is a much lower bar. After you find yourself writing additional related functions, then you can break it off into a new file as easily as you can change a subchapter in a book into a full chapter.

So there's a lot of costs and benefits to breaking up a file vs. keeping it together, and we've seen that having sections and subsections does a lot to lower the cost of keeping it together. But actually, it's pretty rare that I've seen people go too aggressive in breaking up files. More often I see people who think breaking up a file would make it more organized, but there's just too much inertia. And the bigger a file grows, the harder it becomes to break out meaningful components.

That's why having a handful of giant files used to be the hallmark of a bad codebase, one completely disorganized. But this is the real greatness of sections: it's a way to get much of the benefits of splitting up files, but it feels more like jotting down a thought you had than actually doing work. And if you keep things organized in sections, then it's not any harder to break apart a file later than it is now.

So now we know that, just by recording a little bit more of your thinking when writing code, it’s possible to have files which are both large and well-organized. And doing so lets you read code faster, follow control-flow better, delay having to find good names, and literally injects happiness into your life. Let’s make our files large again!

Of course, this is still not the easiest thing you can do to lower the cost of large files.

That would be buying a bigger monitor.