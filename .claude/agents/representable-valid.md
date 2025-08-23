---
name: representable-valid
description: When invoked
model: opus
---


Read the below lecture about the Representable/Valid Principle.

For each data structure in the program, write down the thing that it abstractly represents. 

Does it follow the representable/valid principle? Is there a 1-1 correspondence between what it can abstract and concretely represent?

Does the current representation exhibit any of the MIRO? (Missing, Illegal, Redundant, or Overloaded states)

If so, what bugs can result from misuse?

Think about how to refactor the data structure so that it can represent only the things it's supposed to, and in exactly one way.

Think about the shortest and simplest way to express that

Can it be expressed cleanly without overcomplicating the code?

If so, come up with a plan to refactor the data structure to the more R/V compliant way, and do so.

Once you've refactored all the data structures, now look at every function in the codebase. Is there a way for the signature to be misused? Are there arguments whose purpose is unclear? Are there arguments that can be accidentally swapped, or given invalid values, or passed in the wrong units? Consider using more precise types to make this API harder to misuse.

Also, for each function, ask: is there a similarly-named function that does something very similar, where the user could easily confuse them, as in the example with Thread.start and Thread.run from the lecture? If so, think of alternate names that more clearly distinguish them.

# The Representable/Valid Principle

Consider this code example:

```java
public void setup() {
  Thread backgroundThread = new Thread() {
    public void run() {
      runSetupMain();
    }
  };
  backgroundThread.run();
}
```

and its Python twin:

```python
class BackgroundThread(thread):
    def run(self):
        runSetupMain()

def setup():
    thread = BackgroundThread()
    thread.run()
```

Can you spot the bug?

The call to `run()` does not start a new thread; it just invokes a method on the current thread. The intended call is `start()`, which spins up a separate thread and then invokes `run()` on that new thread. Because `run()` and `start()` sound similar and most code isn’t written to behave differently depending on which thread it runs on, the mistake is both easy and costly. The state diagram behind the scenes looks like this: first an object is created (`new()`), then either `run()` is executed in the same thread or `start()` is called and `run()` executes in a new thread. That confusability is the seed of the bug.&#x20;

The error occurs because the API allows two distinct transitions—“execute in the same thread” and “execute in a new thread”—to be triggered by two very similar-looking calls. Good interfaces should make incorrect actions obvious or impossible, a mindset borrowed from poka-yoke (error-proofing) in manufacturing. For example, it helps to surface the consequence at the call site: “`thread.run()` has been executed in the same thread” versus “`thread.start()` has been executed in a new thread.” The contrast underscores that the two states are genuinely different even if their names rhyme.&#x20;

There are a few ways to make the intent unambiguous. One is to eliminate the possibility of calling the wrong method by construction. For instance, the “do the work in a background thread” action can be packaged into a single expression that always starts a fresh thread:

```java
new Thread(() -> runSetupMain());
```

This pattern removes any temptation to create a thread object and then accidentally call `run()` on it. It also eliminates the extra local variable that invites the wrong call.&#x20;

From this initial example, a broader theme emerges: software is a collection of states, and reliability comes from constraining which states are even reachable. Two complementary lenses are helpful. One lens focuses on **transitions**—the steps that move the program from one configuration to another. The other lens focuses on **states**—the shapes that data and control can take if all transitions are forgotten. The central aim is the same in both views: prevent buggy states by design rather than by vigilance.&#x20;

A crisp way to articulate the aim is the **Representable/Valid Principle**: maintain a one-to-one correspondence between the states the program can represent and the states that are actually valid. If the representation admits states that have no sensible meaning, bugs lurk; if multiple representations correspond to the same meaning, the door opens to drift and inconsistency. The sweet spot is when every representable state is valid, and every valid state has exactly one representation.&#x20;

With that principle in hand, reconsider API design at the call level. “Boolean blindness” is a classic confusability trap:

```java
public void await(boolean interruptible) { ... }

task.await(true); // what does 'true' mean again?
```

The call is unreadable without a trip to the documentation or the implementation. Replace the ambiguous boolean with a small sum type (or enum) whose values speak their intent:

```java
enum Interruptible { INTERRUPTIBLE, UNINTERRUPTIBLE }
```

Now a call site communicates the intended behavior, and the set of representable states is exactly the set of meaningful options—no more and no less.&#x20;

Positional arguments of the same primitive type cause similar grief. A rectangle constructor that takes `(x, y, width, height)` is one typo away from `(width, height, x, y)` silently compiling and doing the wrong thing. Encode the conceptual difference in the type system:

```java
class Rect {
  public Rect(Point p, Dimension d) { ... }
}
```

Now, switching the order of `Point` and `Dimension` fails loudly at compile time. The state space has been tightened: it’s no longer possible to swap a position with a size by accident.&#x20;

The same idea scales to low-level APIs like `memset`. A signature such as:

```c
void* memset(void* dest, int content, size_t length);
```

invites reordering mistakes and type misuse, especially when all three parameters are numeric or pointer-like. Introducing distinct types—even if only typedef wrappers—narrows the corridor of legal calls so that “legal equals meaningful.”&#x20;

Numbers used as codes have their own hazards. Reusing or rearranging integer constants makes two programs disagree about what a number means:

```java
public class ServiceMessages {
  public static final byte UPDATE_STATE = 1;
  public static final byte RESET        = 2;
}

public class ClientMessages {
  public static final byte UPDATE_STATE = 2;
  public static final byte RESET        = 1;
}
```

A message labeled “update state” in one component is a “reset” in another. Enumerations (or sum types) tie names to meanings and prevent accidental reordering, restoring the one-to-one mapping between representation and intent.&#x20;

When integer codes are unavoidable, make incorrect values **unrepresentable in practice**. For instance, reserve “unlikely defaults” or magic debug values that crash deterministically if misused, so mistakes surface quickly rather than silently corrupting state. Even a pointer-sized value like `0xFFFE`—never a valid pointer on conventional platforms—can serve as a tripwire that turns “junk state” into an immediate error instead of a time bomb.&#x20;

So far the focus has been single calls. The same discipline applies to **sequences** of calls. A typical pattern is an API that requires `init()` before any “do” methods:

```java
class SDK {
  static void init() { isInitted = true; }
  static void doThing1() { if (!isInitted) error(); /* ... */ }
  static void doThing2() { if (!isInitted) error(); /* ... */ }
}

// if (almostAlwaysTrue) { SDK.init(); SDK.doThing1(); }
// else { SDK.doThing2();  // bug: forgot to init }
```

Runtime checks help, but the invalid sequence is still representable. The Representable/Valid Principle says to remove the invalid sequence from the type system’s vocabulary. One approach is a token earned by successful initialization:

```java
var token = SDK.init();
SDK.doThing1(token);
// SDK.doThing2(token); // compile-time error if the branch doesn't produce a token
```

Here, `doThing1` and `doThing2` require a non-null `InitializationToken`, which can only be constructed by `init()`. The misuse becomes unrepresentable; the compiler enforces the precondition.&#x20;

Another approach is to return a narrowed interface—an object whose methods are only the valid “post-init” operations:

```java
class SDK {
  static class InittedSDK {
    private InittedSDK() {}
    void doThing1() { /* ... */ }
    void doThing2() { /* ... */ }
  }
  static InittedSDK init() { return new InittedSDK(); }
}
```

Code that skips initialization has nothing of the right type to call, so the illegal sequence no longer exists in the program’s state space. Again, representable equals valid, by construction.&#x20;

Tokens are powerful—but they come with responsibility. If exposed too broadly, they risk being cached, passed around, or forged, re-widening the state space you just tightened. When using tokens, keep their constructors private, scope them tightly, and prefer ephemeral lifetimes. Alternatively, the “narrowed interface” pattern avoids token plumbing entirely and is often the more maintainable way to make sequences safe.&#x20;

The Representable/Valid lens also illuminates data design—the **internal view**. Take a queue. Abstractly, it’s a sequence of elements in order. Concretely, it might be a linked list or a ring buffer: an array with `front` and `back` indices whose contents wrap around the end. Whatever the concrete choice, it should map cleanly to the same abstract meaning. That mapping is the **abstraction function**.&#x20;

To ensure the mapping makes sense, define **representation invariants**—predicates over the concrete fields that must always hold. For an oven modeled with booleans, the invariants include: not both broil and bake at once; if broil or bake is set, the oven is on; if baking, a bake temperature must be present. These invariants carve the island of “meaningful concrete states” out of the sea of “possible bit patterns.”&#x20;

The ideal picture is that every concrete state that satisfies the invariants corresponds to exactly one abstract state, and vice versa—a one-to-one mapping. If two different concrete states mean the same thing (fluff), or a concrete state means nothing (junk), bugs creep in as the program wanders outside the intended manifold. Tighten the invariants until the representable set equals the valid set.&#x20;

A better move than intricate invariants is often to **change the representation** so junk and fluff become unrepresentable. Instead of three booleans plus a nullable temperature, model the oven with an explicit sum type of states:

```java
abstract class OvenState {}
class OffState   extends OvenState {}
class BroilState extends OvenState {}
class BakeState  extends OvenState { int temp; }
```

Now “off and baking” can’t even be expressed. The representation itself encodes the allowed states, aligning representable with valid.&#x20;

The same pattern clarifies multi-object data. Consider a shareable to-do list represented by an `items` array and a `sharedWith` map from person to their visible sublist. The intended invariant is that each `sharedWith[name]` is a sublist of `items`. Violations create junk states (a person seeing an item that isn’t in `items`) or fluff (two structures that redundantly encode the same thing but drift apart). Restructure the representation so that the invariant is either tautological or enforced by types and construction routines rather than by hope.&#x20;

Outside-facing models benefit too. An `ImageResource` expressed as `{ String filename; int width; int height; }` invites bogus filenames and non-positive dimensions. Tighten the types—`File` instead of `String`, and positive integers for dimensions—and then notice a further refinement: width and height are derivable from the file and are therefore a **cache**. Caches create fluff and staleness unless invalidation is perfect; the simplest fix is to remove the cache and compute from the source of truth when needed.&#x20;

A recurring anti-pattern is “MIRO”—designs that let messy encodings creep in. A toy example is “a list of length up to two” modeled as `Pair<Optional<A>, Optional<A>>`. Code now branches on whether the first optional is present to decide if the list is empty, and the structure becomes redundant and overloaded. The representation admits junk and fluff where a small, explicit `Zero|One|Two` sum type—or simply a tiny array—would have kept representation and meaning in lockstep.&#x20;

The thread bug that opened this discussion has cousins. On some slides the attempt to “prevent” the error still leaves a footgun—for example, overriding `protected void run()` or wrapping the call so that `run()` is still available to be invoked directly. A safer shape is one that **removes `run()` from the surface area** at the point of use—e.g., constructing and starting the thread in the same expression—so the illegal transition is literally absent.&#x20;

All of these techniques—clearer parameter types, enums instead of booleans, state-specific objects returned after initialization, sealed state hierarchies for data, eliminating redundant caches—serve the same aim. They reduce the set of representable program states until it coincides exactly with the set of valid states. They also reduce the set of representable **transitions** to just the valid ones, making bad call sequences unspellable and bad data shapes unbuildable. When that alignment holds, many bugs stop being “unlikely” and become “impossible.”&#x20;

Put succinctly: the constraints are already in mind or scattered as runtime checks; move them into the code as types and construction rules. Precision in types and representations is not over-engineering—it’s the shortest path to clarity, correctness, and maintainability. The power of a design lies not in what it can do, but in what it cannot do.&#x20;
