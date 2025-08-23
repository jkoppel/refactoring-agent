# Deduplicating agent: File

Look over the list of files. Whenever there are two files that appear to do the same thing, inspect them both. Ask: does one appear to be a better version of the other? If so, update all things that refer to the worse version to instead use the better version, then remove the worse version.

If neither is strictly better than the other, try to find individual functions that have the same purpose. Create a combined file that only has one copy of each such function, and remove the old files. Make sure everything still works.
