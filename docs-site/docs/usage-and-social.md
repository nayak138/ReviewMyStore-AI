---
title: Usage & Social Publishing
description: Understand business allowances, provider capacity, usage windows, and social publishing requirements.
---

# 5-Star.AI Usage & Social Publishing Guide

A plain-language guide to business allowances, Google review imports,
AI-assisted review writing, social posts and comments, connected Meta
channels, and media requirements.

This guide explains how the categories work; it does not promise a fixed plan
allowance or provider quota. The availability of an action can depend on both
the business allowance and separate provider or platform restrictions.

## Business allowances and provider limits

5-Star.AI app allowances are tracked against a business. Reconnecting or
switching a Google or Meta identity does not reset that business’s allowance.
Social usage is shared across the social channels connected to the same
business.

Each business can import up to **200 Google reviews per UTC calendar month**.
This is a business allowance, not an account-wide allowance. Google review
imports also depend on separate upstream import capacity (shown in the app as
Google provider limits). The separate **bundle.social provider cap is shared
across all connected businesses and is not an additional 200-review
entitlement**. If either limit is exhausted, new imports may have to wait until
the corresponding allowance resets or provider capacity becomes available.
Existing reviews remain available.

## What the usage terms mean

- **Limit:** The total units available in the current usage window for that
  action.
- **Used:** Units from completed operations that count against the allowance.
- **Reserved:** Units held while an operation is in progress. The reservation
  prevents simultaneous work from spending the same remaining unit.
- **Remaining:** Units available after both completed work and in-progress
  reservations are accounted for.

If an operation fails, its reservation is released rather than counted as
completed usage. In recent usage history, **Completed** means the operation
succeeded, **In progress** means it is still running, and **Released** means
a failed operation gave its reservation back.

## Daily and monthly reset windows

Different actions can use daily or monthly windows. The periods follow UTC
boundaries: a daily window changes at UTC midnight, and a monthly window
changes at the start of the UTC calendar month. The app may display the reset
timestamp in your local time, so it can appear at a different hour in your
region. Reconnecting or changing an account does not start a new window.

## Google reviews and AI writing

- **Google review import** fetches existing reviews into the review inbox.
  Imports are affected by both the business allowance and the separate
  upstream import capacity.
- **AI reply draft** suggests wording for a response to an existing Google
  review. It remains a draft until a teammate reviews and explicitly publishes
  the reply.
- **Public AI review generation** helps a customer write a new review. It is
  separate from importing reviews and from drafting a business reply to an
  existing review.

These are distinct actions and can have separate usage accounting. A limit on
one does not by itself mean the other actions have the same limit.

## Social posts, comment imports, and replies

A social post is counted by destination. For example, sending one post to
Facebook and Instagram uses one post unit for each selected destination.
Scheduling a post also uses the selected destinations’ post allowance, so
cross-posting consumes one unit for every selected destination.

Comment import fetches comments from a connected platform for a published post
so your team can review them. Each imported comment may receive at most one
reply. A newly imported comment and its same-day reply share one daily comment
unit; a reply sent on a later UTC day uses one unit in that day's allowance.

The business app allowance and any separate platform or provider restrictions
can both apply to social actions. A provider may reject an action even when
the business still has app allowance remaining.

### Meta usage caps

Meta usage is aggregated across all connected Meta platforms (Facebook and
Instagram), rather than reset separately for each connected platform. The
monthly base limits are **50 posts**, **25 imported comments**, and **500
completed media uploads**. Hard daily limits are **10 posts**, **5 comment
units**, and **100 completed media uploads**.
Cross-posting still consumes one post unit per selected destination. Each newly
imported comment uses one daily comment unit. Its single allowed reply shares
that unit if sent on the same UTC day; a reply sent on a later UTC day uses one
unit on that day. No imported comment may receive more than one reply.

Usage warnings appear at 80% of the applicable daily or monthly limit. Daily
Meta caps are hard stops. Google review imports also stop at the 200-review
business cap per UTC month, independently of the shared bundle.social provider
cap. Meta monthly base limits determine the overage tier and do not stop
otherwise-permitted activity. Owner and admin users can see a manual invoice
estimate for monthly overages. Estimates are not automatic charges, and
5-Star.AI does not automatically collect payment.

Monthly overages are tiered by category block (posts, imported comments, and
completed media uploads). The highest category multiplier reached applies once
to the quoted base amount; category multipliers are not stacked or applied
once per destination. Usage within the monthly base limit is 1×; the first
additional block equal to that category’s base limit is 2×, and the second
additional block is 3×. For example, 51–100 posts is the 2× post tier, and
101–150 posts is the 3× post tier. Only the highest tier reached across the
three categories sets the manual invoice estimate.

## Choosing or switching a Meta channel

Authorize Meta access, then choose the exact available Facebook Page or
Instagram profile to attach to the right business.

If Meta opened the wrong login, use **Reconnect access**. It clears the old
provider login before Meta opens again, so you can authorize the correct
account.

To replace an attached Page or profile, use **Switch** in **Connected
channels**. The current channel stays active until the replacement is selected
and confirmed.

Changing the provider login or attached channel changes where the business can
publish; it does not create a new business allowance.

## Instagram media and scheduled posts

Instagram publishing requires at least one image or video. The composer
accepts JPG, PNG, WEBP, GIF, MP4, MOV, and WEBM files. Images can be up to
25 MB each; videos can be up to 100 MB each.

Attached media is prepared with the social provider when a post is published
or scheduled. Adding media to the composer does not publish the post
immediately. For scheduled posts, the media is processed as part of the
scheduled publishing flow.

## Quick examples

- A post sent to Facebook and Instagram uses two social-post units, one for
  each destination.
- A failed in-progress operation releases its reservation, so it does not
  remain counted as completed usage.
- Changing the Google or Meta login does not reset the selected business’s
  allowance or reset window.