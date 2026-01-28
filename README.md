# Cloudflare PM Intern Assignment
By Tanvi Vidyala

## Overview

As an aspiring Product Manager with a data-heavy background, I have often noticed that the hardest part of product decision-making is not analyzing data. It is transforming unstructured data into something a PM can actually act on. Feedback can come from a variety of places such as emails, support tickets, surveys, and social posts. It is scattered, qualitative, and difficult to summarize inside tools like Tableau or Power BI without heavy manual work.

This prototype explores how Cloudflare’s developer platform can be used to summarize fragmented feedback into a dashboard that immediately surfaces:

* What users are complaining about
* What users are praising
* What themes are trending
* What issues require urgent attention

Instead of reading dozens of messages manually, a PM can open a dashboard and instantly understand what is happening!

## The Problem

Product Managers rely heavily on user feedback to guide roadmap decisions. However:

* Feedback across multiple channels
* It is unstructured text, not clean data
* Themes, urgency, and sentiment are hard to extract at scale
* Traditional BI tools require pre structured data and manual tagging

As a result, PMs spend time reading messages instead of making decisions.

## What This Prototype Does

This system ingests mock feedback from multiple sources such as:

* Surveys
* Emails
* Support tickets

Each feedback item is:

1. Stored in a structured database
2. Automatically analyzed using AI for:

   * Sentiment (positive, negative, neutral)
   * Category (bug, feature request, complaint, etc.)
   * Key themes
3. Embedded into a vector space for semantic search

The processed results are displayed in a dashboard showing:

* Sentiment breakdowns
* Category distributions
* Trending topics
* Critical issues requiring attention
* Supporting user quotes in context

A user can also perform natural language search to find semantically similar feedback even when wording is different.

## How a PM Would Use This

A PM opens the dashboard and can immediately:

* See what is going wrong
* See what users appreciate
* Identify the most common complaints
* Understand how widespread an issue is
* Pull real user quotes to support roadmap decisions
* Communicate clearly with engineering using evidence

## Architecture Overview

This prototype uses several Cloudflare products working together.

| Product        | Why It Was Used                                         | Role in the System                                                              |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Workers**    | Needed serverless compute for API logic                 | Acts as the backend that routes requests and orchestrates services              |
| **D1**         | Needed a database that integrates natively with Workers | Stores raw feedback and AI analyzed results                                     |
| **Workers AI** | Needed automatic classification without manual labeling | Runs Llama 3.1 for sentiment and category classification and BGE for embeddings |
| **Vectorize**  | Needed semantic search capability                       | Stores embeddings and enables “find similar feedback” queries                   |

## System Flow

1. When the dashboard loads, the system checks D1 for unanalyzed feedback.
2. Any new feedback is sent to Workers AI:

   * Sentiment and category are generated and stored.
3. At the same time, vector embeddings are created and stored in Vectorize.
4. Once analysis is complete, the dashboard displays:

   * Sentiment breakdown
   * Category distribution
   * Word cloud of common terms
   * AI-generated summary of key issues
5. Users can search feedback using natural language.
6. Vectorize returns semantically similar feedback, even if keywords do not match.

## Vibe Coding Context

Built using **Claude Code** for rapid prototyping and iteration.
