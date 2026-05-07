---
title: Query Parameters
slug: query-params
order: 4
---

# Query Parameters

Query params work on **GET** (filter response), **PATCH** (select items to update), and **DELETE** (select items to remove).

## Search

```
?search=<term>
```

Case-insensitive match against all string fields.

::api-example{method="GET" path="/johndoe/products?search=gad"}
::

## Sort (GET only)

```
?sort=<field>&order=asc|desc
```

Default order `asc`.

::api-example{method="GET" path="/johndoe/products?sort=price"}
::

::api-example{method="GET" path="/johndoe/products?sort=price&order=desc"}
::

## Filter

Two syntaxes:

### Colon

```
?filter=<key>:<value>
```

::api-example{method="GET" path="/johndoe/products?filter=inStock:true"}
::

### Direct

```
?<key>=<value>
```

::api-example{method="GET" path="/johndoe/products?inStock=true"}
::

## Pagination (GET only)

```
?_limit=5
?_skip=10
?_start=0&_end=5
```

## Mutations

Query params select items for batch update or delete.

::api-example{method="PATCH" path="/johndoe/products?inStock=false" body='{"inStock":true}' auth="true"}
::

::api-example{method="DELETE" path="/johndoe/products?inStock=false" auth="true"}
::

## Combined

::api-example{method="GET" path="/johndoe/products?search=pro&sort=price&order=desc&_limit=10"}
::

::api-example{method="PATCH" path="/johndoe/store/inventory/items?category=electronics" body='{"discount":0.1}' auth="true"}
::

::api-example{method="DELETE" path="/johndoe/store/inventory/items?inStock=false" auth="true"}
::
