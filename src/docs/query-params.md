---
title: Query Parameters
slug: query-params
order: 5
---

# Query Parameters

Apply to array values at any depth. Combine freely.

## Search

```
?search=<term>
```

Filters array items where any string field contains the term (case-insensitive).

### Example

::http{method="GET" path="/johndoe/products?search=gad"}
::

Returns items whose any string field includes "gad".

## Sort

```
?sort=<field>&order=asc|desc
```

Sorts array of objects by a field. Default order is `asc`.

### Examples

::http{method="GET" path="/johndoe/products?sort=price"}
::

::http{method="GET" path="/johndoe/products?sort=price&order=desc"}
::

::http{method="GET" path="/johndoe/products?sort=name&order=asc"}
::

## Filter

Two formats:

### Colon syntax

```
?filter=<key>:<value>
```

::http{method="GET" path="/johndoe/products?filter=category:electronics"}
::

### Direct param

```
?<key>=<value>
```

::http{method="GET" path="/johndoe/products?inStock=true"}
::

## Combined Example

::http{method="GET" path="/johndoe/products?search=pro&sort=price&order=desc"}
::

Returns all products matching "pro", sorted by price descending.

Nested paths + query params work together:

::http{method="GET" path="/johndoe/store/inventory/items?search=widget&sort=price&order=asc"}
::
