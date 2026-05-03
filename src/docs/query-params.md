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

```
GET /johndoe/products?search=gad
```

Returns items whose any string field includes "gad".

## Sort

```
?sort=<field>&order=asc|desc
```

Sorts array of objects by a field. Default order is `asc`.

### Examples

```
GET /johndoe/products?sort=price
GET /johndoe/products?sort=price&order=desc
GET /johndoe/products?sort=name&order=asc
```

## Filter

Two formats:

### Colon syntax

```
?filter=<key>:<value>
```

```
GET /johndoe/products?filter=category:electronics
```

### Direct param

```
?<key>=<value>
```

```
GET /johndoe/products?inStock=true
```

## Combined Example

```
GET /johndoe/products?search=pro&sort=price&order=desc
```

Returns all products matching "pro", sorted by price descending.

Nested paths + query params work together:

```
GET /johndoe/store/inventory/items?search=widget&sort=price&order=asc
```
