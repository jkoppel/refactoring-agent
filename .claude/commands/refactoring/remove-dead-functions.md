For every function in the $ARGUMENTS file, search to see if that function is actually used. If not, then delete it.

Please be very certain first. E.g.: if it's a web app, you might not notice if an endpoint is being called from the frontend. If there is reflection or metaprogramming somewhere in the codebase, then it can be hard to tell what is being called.

For each function you've deleted, look at each function it calls, and repeat this exercise until quiescence.
