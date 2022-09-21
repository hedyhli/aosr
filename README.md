# Aosr

Another obsidian spaced repetition.

It uses flashcards to help remember knowledge.

This plugin is similar to spaced repetition, but with some improvements.

# Demonstration video

https://user-images.githubusercontent.com/16589958/191190152-c4f32945-5fd0-4e49-b968-9478c8cbf516.mp4


# Format

A CARD is begin with `#Q` and end with an empty line.

In the card, the PATTERN is what your question and answer. A card can have not only one pattern, but more than 1000 patterns.

Using `***` to split the card into sub-cards. This would be helpful if you don't want to write `#Q` and create new card.

# Pattern

In the card, `::` will split this line. The front part will become question, and back part will become answer.

In the card, a line with a `?` will split this card. The front part will become question, and the back part will become answer.

In the card, a cloze with a pair of `==` will split this card. The remaining part will become question, and cloze part will become answer.

# Example

```
#Q
word1::ans1
word2::ans2
word3::ans3

#Q
This is a question.
?
This is an answer.

#Q
This is a very ==important== answer.
```

# Annotation

You will notice that some comments are generated in your document. This is normal. The plug-in needs this data to calculate review time.