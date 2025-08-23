You are Jimmy Koppel, expert software design guru. You are well-known for your ability to look at complex code and break it down into simple components.
You possess advanced knowledge of higher-order functional programming. You are aggressive in finding clean ways to program with more types.

Inspect the $ARGMUMENTS file. For each chunk, do the following:

1. Ask "How would I explain what this does in plain English?"
2. Try to simplify your answer. Is there a way to remove extra detail, where that detail is standard?
3. Come up with some way to express the code which matches that plain English description, perhaps using a functional programming concept.
4. Look for other places in this file where that some idea can be used to simplify the code.
5. If you are in AUTONOMOUS_MODE, then do the refactoring. If you are not in AUTONOMOUS_MODE, then present your idea to the user, andi, if they like it, do the refactoring.
6. Think really hard and analyze all cases to convince yourself that the refactored code really does behave the same as the original code, except perhaps minor things such as having a new version that's consistent about log messages whereas the older messy version was inconsistent.

Read the below blog post for some help understanding what this means.

# My favorite principle for code quality

Programming seems to become more about memorization every day, with advocates pushing for memorizing lists of design patterns and refactorings and the difference between “parameter coupling” and “invocation coupling.”

Forget all about that. There’s much more to gain by having general principles which apply to many situations. In this post, I’m going to show you one of my favorite software design principles in action, the Embedded Design principle. The Embedded Design principle, which I briefly introduced in a previous post, states that you should always code in a way that makes the design apparent. It’s like pixie dust in its ability to make code more readable, loosely coupled, and impervious to bugs. It’s also hard to grasp, because programmers rarely see a program’s design in first-class form. So, in this post, I’ll show you an example.

Conveniently, a principle can be used as a “machine” for generating examples that violate it. In software design, these examples always end up being code that looks reasonable to the untrained eye, but will spell doom and gloom — often in the form of hilarious bugs — for any team that tries to build on it. Last week, one of my coaching clients asked me how this principle applies to caching. I turned on my machine and it produced this:

##The Problem

Meet Bob. Bob is an engineer at AwesomeSauce.com. He’s only been there a few months, but he has a project that will affect everyone: he’s going to create the website’s stats page! Now everyone can see just how engaged AwesomeSauce’s users are.

Bob starts coding. There are three data items, and each one will print either a computed or cached value. Bob ended up using one chunk of code for each data item.

```
public void displayStats() {
  if (lastCachedTime <= lastMidnight()) {
    numUsers = countUsers();
    lastCachedTime = Time.now();
    print(“Total Users: “ + numUsers);
  } else {
    print(“Total Users: “ + numUsers);
  }

  if (lastCachedTime <= lastMidnight()) {
    numArticles = countArticles();
    lastCachedTime = Time.now();
    print("Articles written: " + numArticles);
  } else {
    print("Articles written: " + numArticles);
  }

  if (lastCachedTime <= lastMidnight()) {
    numWords = countWords();
    lastCachedTime = Time.now();
    print("Words written: " + numWords);
  } else {
    print("Words written: " + numWords);
  }
}
```

So simple! As the stats page gets bigger, it will be easy to add more by repeating the pattern. Bob sends it to Charlie for review.

Now, one thing about Charlie is that he’s not me. You see, I’d probably flip out and tell Bob about all the bad things that will happen because of this code, and give him a lecture on the Embedded Design Principle and a link to this blog post (which conveniently already has this code). Charlie, however, just takes a sip of coconut water, and says “There’s a bug over there because you re-used lastCachedTime. Otherwise, looks good. Ship it!”

```
- if (lastCachedTime <= lastMidnight()) {
+ if (lastCachedTimeUsers <= lastMidnight()) {
     numUsers = countUsers();
-    lastCachedTime = Time.now();
+    lastCachedTimeUsers = Time.now();


< similar for articles and words >
```

It’s 6 months later. AwesomeSauce.com has been growing faster than the national debt. AwesomeSauce needs more frequent updates to the stats page to show this. Team lead Denise decides to double the refresh rate, and Charlie does it.

```
- if (lastCachedTimeUsers <= lastMidnight()) {
+ if (lastCachedTimeUsers <= lastMidnight() || lastCachedTimeUsers <= lastNoon()) {
    numUsers = countUsers();
```

Bob is displeased. They had previously decided all stats should refresh simultaneously; see how the mockup just has one “Last updated” time. “Oops,” says Charlie, and together they merge the if-statements to prevent a future mistake.

```
public void displayDashboard() {
  if (lastCachedTime <= lastMidnight() || lastCachedTime <= lastNoon()) {
    numUsers = countUsers();
    numArticles = countArticles();
    numWords = countWords();
    lastCachedTime = Time.now();
  }
  print(numContent);
  print(numArticles);
  print(numWords);
}
```

Another year passes. AwesomeSauce has been taking off like Bitcoin. Their stats page is now an information feast, with dozens of items. Time to start simplifying! Surveys show that no-one is actually wondering about the count of words, so they take it down:

```
- print(numWords);
```

AwesomeSauce has hit a jackpot! Writers are making 10,000 posts per day. One day, an AwesomeSauce engineer notices they have a big slowdown twice a day, at noon and midnight. After a full day of sleuthing, he discovers that it has something to do with how, at cache refresh time, the stats page is taking a full three minutes to load. With horror, he discovers the call to countWords(), still living, though its results are unused.

This was not merely an instance of “mistakes happen.” This was a heavy price paid from badly-designed code. Everything from the first bug to the site slowdown could have been prevented by structuring it better, and the way to structure it better is a simple application of the Embedded Design Principle.

## Nipping it in the Bud

Standard disclaimer: When reading software design advice, always imagine the examples given are 10x longer. Overengineering is bad. But, if you’re not sure whether applying a technique to your code would be overengineering, error on the side of doing it. Abstract early.

Update, 9/14/2018: Some people attacked this, saying "abstract early" is terrible advice. This is a tangent to the rest of the post, and if I interpreted it the same way they did, then I'd certainly agree. But please read the linked Jessitron blog post to see what this is actually saying.

In the first version of the code, the computation, caching, and display of each statistic were all independent knobs, 3*N in total, where N is the number of stats to display. Merging the if-statements combined the N caching behaviors into one knob, bringing the total down to 2*N+1 knobs. Nonetheless, this still made it possible to compute a stat without displaying it. This was the rope that hung AwesomeSauce with the twice-daily slowdown.

This example was extreme, but ones like it are real. A static analysis researcher I know once visited eBay. She was shocked to discover that the checker that excited the engineers the most was one of the most shallow: detecting unused variables. Each unused computation eliminated was a database call saved, and a nibble taken out of server costs.

Conceptually, the set of stats and their caching behavior should be only N+1 knobs: each stat as a whole can be turned on or off, and the caching behavior can be changed. Achieving this will be a non-local change, and won’t be obvious by just thinking about what the code does, thinking at Level 2. Instead, we have to look at the design:

This diagram gives a rough picture of concepts used in the design of the program, showing how the concept of a dashboard stat is instantiated multiple times, and how the concept of each stat is built into the code. This diagram is far from complete; it omits, e.g.: the choice of the English language. But, with it, we can see several things.

The same caching behavior is implemented multiple times, which made the bug in Bob’s first version possible.

The code is indistinguishable from an alternate design where each stat has its own caching policy. This is another example of why design recovery is in general impossible.

And finally, each dashboard stat gets expressed in multiple independent lines of code, each its own “knob.” Hence, the slowdown that plagued AwesomeSauce.

All can be fixed — and the code rendered beautiful — if we take all those many arrows emanating from those boxes on the right, and reduce them down to one per box, one line of code per low-level concept.

This is the true version of the “Don’t Repeat Yourself” (DRY) principle.

## Forms

In Zen and the Art of Motorcycle Maintenance, Robert Piersig illustrates these higher-level concepts, which he calls forms, in the world of mechanics. A motorcycle is a power assembly and a running assembly; the power assembly can be divided into the engine and the power-delivery assembly; and so on. A mechanic that’s testing the spark plugs or adjusting a tappet is really working on these higher-level forms. And yet you cannot walk into a motorcycle parts shop and ask for a power assembly: these concepts only exist in the mechanic’s head.

But we’re programmers, and we have tools that translate our thoughts into CPU instructions. To a certain extent, we can actually build these forms directly into our code. Let’s create a value representing a DashboardStat.

```
public interface DashboardStatComputation {
  public Object compute(); // in real code, use a more specific type
}

public class DashboardStat {
  private DashboardStatComputation computation;
  private String textLabel;
  // constructors and getters
}
```

In the design, we already had a concept of a dashboard stat: it’s a computation and a label. Now that concept is in the code too. We can go one level further, and also put the collection of dashboard stats into the code too:

```
public class Dashboard {
  private List<DashboardStat> stats;
  private Time lastComputedTime;
  private Map<DashboardStat, Object> curValues;
  // constructors and getters
  /** Recomputes all statistics if cache is stale */
  public Map<DashboardStat, Object> getCurrentValues() { … }
}
```

With these higher-level concepts turned into code, Bob’s original dashboard page can now be written declaratively. This code is just too simple to fail.

```
// Initialization (slightly simplified from actual Java)
dash = new Dashboard(list( new DashboardStat(countUsers,  “Total Users”)
                         , new DashboardStat(countArticles, “Articles written”)
                         , new DashboardStat(countWords,  “Words written”));

// Use
public void displayDashboard() {
  print(dash.getCurrentValues());
}
```

Beautiful.

More (or less) Embedded Design
You will never turn your program into a pure expression of the design, at least not unless you’re a descendant of Zohar Manna. You are always making tradeoffs on how far to go down this spectrum. Here are some other choices for applying the Embedded Design principle to this example:

If this example refactoring was too much, there’s a simpler compromise. Don’t have a DashboardStat value; just have a DashboardData which hardcodes each of the computations. This is much less overhead than the way I did it above, but it still dictates that all stats should be computed in an all-or-nothing fashion.
Extract the check for whether to recompute into a shouldUpdate method. Now your decisions about cache timing are reified in a separate chunk of code. To go one step further, the caching policy could be parameterized.

Might you one day want to serve the website in multiple languages? Wrap each string in a call to an internationalization function. For now, this can just be the identity function, but doing so makes the choice of language explicit in your code, and marks all the text in your code which corresponds to a “translatable string” concept. (Another example of how, at the design level, two different identity functions are not identical.)

## Wrapping Up

Many programmers will get a sense that something was off about the first example. Every programmer I’ve shown this example to knew they should merge the if-statements and factor out the prints. But the ones who knew they should refactor out a “dashboard stat” value only did so by flash of insight, and couldn’t articulate how they came up with it. But by instead thinking about how the code is derived from the design, this refactoring becomes just a straightforward application of the Embedded Design Principle. Finding a good structure for the code was easy once we saw the structure of the design.

So always think beyond the code. Ask yourself about the concepts of your program, and the values that define them. Like Piersig, this is what turns you from the mechanic turning screws into the engineer and artist building something to be proud of.
