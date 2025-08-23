---
name: code-unifier
description: When invoked
model: opus
---

For each function in the given file or folder, do the following:

First, ask: what is the purpose of this function? What operation is it meant to perform? Write that down. Write it at a high level of abstraction, avoiding mention of implementation detail.

Then search through the rest of the program. Is there another function that seems similar? Write down its purpose and what it represents as well. Again, write it at a high level of abstraction, avoiding mention of implementation detail.

If they appear to be a match, look at their use-sites. Can you think of a way to combine these two functions into one?

Read the below blog post, "The Design of Software is A Thing Apart." Would you be committing a mistake by merging them? Beware that functions that represent different things at a deep level may have superficially similar code.

If you conclude that they do fundamentally serve the same purpose, merge them. Think hard about what the combined function should be and how to make it simple. Find a good place for it.





# The Design of Software is A Thing Apart

Big up-front planning phases are out. Rapid iteration is in. With all this movement towards agile, it’s increasingly tempting to throw out the idea of having a separate design doc for software in favor of just getting started and having self-documenting code.

And that is a fatal mistake.

Last week, I explained that we speak about program behavior at one of three levels: executions, code, and specification. Most knowledge about software design is contained in Level 3, the specification. The flipside: the information of a program’s design is largely not present in its code1. I don’t just mean that you have to really read the code carefully to understand the design; I mean that there are many designs that correspond to the exact same code, and so recovering all the design information is actually impossible.

In that post, I talked a lot about the example of describing malloc and free, and how it’s quite possible to have a semantic-level notion of “freeing memory” that corresponds to absolutely nothing in the implementation. In this post, I give three more examples. The first discusses the problem of testing too much, and how the decision of what to test is in general unrecoverable from the code. The second is a question of coupling which cannot be answered from the code alone. The third shows how an identical comparison function may have different meanings in different contexts, with different expectations about how the code may evolve. None of these examples will cause your code to break, at least not today. What they will cause are the characteristic problems of bad design: fragile tests, and the risk of extra work and bugs tomorrow. The first two examples are based on real code I’ve encountered (or written!), which caused exactly those problems.

Let’s begin!

1) What should you test?
“Write the tests first,” say advocates of test-driven development, “and the code will follow.” Doing so forces you to think about what the code should do before writing it. What it doesn’t do is get you to separate the code’s goals from its implementation details.

So you update the code, a test fails, and you think “Oh. One of the details changed.” Should you update the test to compensate? If you tried to use TDD as a substitute for thinking about the design, then you probably will. Congratulations, you now have a fragile test. Writing tests in this fashion is mistake #7 in my booklet “7 Mistakes that Cause Fragile Code”.

Here’s some code and its test. Is this a good test?

Code (pseudo-Java):
public void postProfileUpdateToServer(User u, Profile p) {
  appState.saveCurrentState();
  HttpParams params = …;
  addProfileToParams(params, p);
  HttpResult res = httpClient.post(getPostUrlForUser(u), params);
  logger.logUpdateEvent(u, p); // calls appState.saveCurrentState()
  if (res.getResponseCode() != Http.HTTP_SUCCESS)
    scheduleRetry(u, this.updateBlock);
}
Test checkPostProfileUpdateToServerAssumeSuccess (pseudocode):
  Call postProfileUpdateToServer with user Bob,
       and his profile with address changed to 123 Mulberry St
  Check that httpClient.post was called once
  Check that its first argument was
               “www.website.com/callbacks/updateprofile/bob/”
               Check that the first parameter is the user’s E-mail address,
                  the second their mailing address,
                  and the third their preferred language
  Check that appState.saveCurrentState was called twice
( How do you check that httpClient.post was called? This is quite easy to do using a mocking framework such as Java’s Mockito. I quite recommend it, as a way to unit-test functionality purely in terms of how it’s defined using other operations. )

There are generally two ways to write bad tests. One is to miss cases and not be rigorous enough. This is what happens when developers chase code coverage without actually thinking about what they’re testing. A common blind spot is that a programmer will test what happens when a program goes right, but not test what happens when a server’s down, when it’s fed bad input, etc.

The other is to test too much and be too specific. Is it part of the design that postProfileUpdateToServer must call appState.saveCurrentState twice, and it chooses to do so once by calling logger.logUpdateEvent? I don’t know. The test assumes a certain order about the HTTP parameters, but does the Profile object guarantee it? If the Profile uses a hash table internally, then the order is arbitrary, and may change when upgrading the libraries. Then the test will fail when upgrading to a new version of Java. (This is why Go randomizes hash table iteration order; one of my colleagues built a tool that does the same for Java.) At the extreme, I’ve seen a very experienced programmer write tests like assert(MSG_CODE_UPLOAD_COMPLETE == 12), which, given that these constants are meant to encapsulate knowledge, kinda defeats the point of having them in the first place.

The code should not follow the tests, nor the tests the code. They should both follow the design.

2) Do these pieces of code know about each other?
One nice thing about understanding the design/specification level of code is that it gives us very clean definitions of formerly-fuzzy concepts like “this code knows about that code.” For now, stick with your intuition as you answer this question:

Here are three modules. Module 1 defines a “student” record. Module 2 defines an “employee” record, and creates them by turning students into student employees. Finally, module 3 uses employee records, namely by printing them.

Oh yeah, and this example is in pseudo-JavaScript, so there’s no notion of “type” other than “the set of stuff this function can return.” Here’s the code:

Module 1 :

function makeStudent(firstName, lastName) {
  return {firstName: firstName, lastName: lastName};
}

Module 2:

function makeStudentEmployee(student) {
  var e =  student.copy();
  e["employeeId"] = nextEmployeeId();
  return e;
}

Module 3:

function printEmployeeFirstName(employee) {
  console.log(employee["firstName"]);
}
So, Module 3 accesses the firstName field of the employee value, which is defined in Module 1. Now, the question is: does Module 3 know about Module 1. That is, does the description of what Module 3 does need to be written in terms of the description of what Module 1 does?

The answer is: it depends. If the documentation of Module 2 is “Returns a student employee record with firstName, lastName, and employeeId fields,” then the answer is a clear No; it’s just an implementation detail that it obtains a student-employee record by appending to a student record. If the documentation is “Returns a student record with an additional employeeId” field, then it really is the case that you can’t know what’s in the argument to printEmployeeFirstName without reading Module 1, and so modules 1 and 3 are very much coupled.

3) What does this code accomplish?
Quick! What does this line of code accomplish?

  return x >= 65;
Two possible answers:

x is an ASCII character which is already known to be alphanumeric; this code checks if it’s a letter. 
x is an age of a person; the code checks if the person is past the retirement age in the US. 
In both possible answers, the code is the same. I can probably find examples where the surrounding context is the same too. If this is just a standalone function lying in a Utils file somewhere, it makes absolutely no difference to the program which I use it for; I could even use it for both. But it makes a massive difference to the evolution of the program.

The former may need to be changed for internationalization, while the latter may need to be changed following changes in US laws. The former should live alongside other functionality related to character sets; the latter alongside code relating to people or company policies. And in the former case, since there’s a bunch of non-alphanumeric ASCII characters between “9” and “A”, some crazy-optimizing programmer could change it to “return x >= 64” and then optimize it to use bit-ops like “return (x >> 6)” with no effect on the program. In the latter, that might lead to a lot of erroneously-sent retirement benefits.

Meanwhile, if you were trying to prove the correctness of a program that used this function, the proof environment would not be convinced that Bob is eligible for retirement benefits just because that function returned “true” until you tell it exactly what this function is meant to do.

If you just think about the code, then the letter ‘A’ is the same as the retirement age. So focus on the design.

Credit to Ira Baxter for this example.

Writing Better Code
I gave you three examples of situations where it’s impossible to recover design information from the code alone. For the tests, there’s no solution other than to have the design written somewhere separately, so you can know whether the order of HTTP parameters is stable, or whether to rely on the number of times saveState is called. For the code examples, it’s actually quite possible to change the code so that it only corresponds to one design. For that unclear case of coupling, if you want to make it clear that modules 1 and 3 are separate, have module 2 create records with explicit fields. For that retirement age check, just write it as “return x >= RETIREMENT_AGE”. Even if RETIREMENT_AGE and ASCII_A (usually spelled just 'A') have the exact same runtime values (for now), they represent different concepts. They are not interchangeable in the design, nor in a formal proof.

This gives rise to my first rule of writing good code:

Jimmy Koppel’s rule of good code #1: Make the design apparent in the code (Embedded Design Principle).

Sounds simple, but it’s quite vague and subtle until you’ve really internalized how code is derived from a design. I’ve given multiple workshops exploring different aspects of this idea, especially around coupling.

Some things are better left unsaid
In statistics, we used to think that, if you had enough data, you could learn anything. Then the causal inference guys came along and showed us that, actually, even with infinite data, there can be many processes that generate the same observations. If you just collect data about what days there was rain in town and what days your lawn was muddy, you can’t tell the difference between a universe in which rain causes mud and one where mud causes rain. You need to know something more.

Software design is the same way: there can be many designs that correspond to the exact same code. Those who speak of “self-documenting code” are missing something big: the purpose of documentation is not just to describe how the system works today, but also how it will work in the future and across many versions. And so it’s equally important what’s not documented.