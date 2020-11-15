# Koji IAP
![npm (scoped)](https://img.shields.io/npm/v/@withkoji/iap?color=green&style=flat-square)

**In-app purchase infrastructure for Koji templates.**

## Overview

The @withkoji/koji-iap package enables you to implement in-app purchases from your Koji templates. For example, require a purchase to unlock a premium asset or a game. This package provides frontend methods, for managing transactions with users, and backend methods, for validating purchases against receipts.

## Installation

Install the package in the frontend and backend services of your Koji project.

```
npm install --save @withkoji/iap
```

**NOTE:** To support instant remixes of your template, you must also install the [@withkoji/vcc package](https://developer.withkoji.com/reference/packages/withkoji-vcc-package) and implement the `VccMiddleware` on your backend server. This middleware maintains the process variables for instant remixes, ensuring that purchases are applied to the correct remix version.

## Basic use

Instantiate `Iap` on the frontend.

```
import Iap from '@withkoji/iap';
const iap = new Iap();
```

Instantiate `Iap` on the backend.
```
import Iap from '@withkoji/iap';
const iap = new Iap(
  res.locals.KOJI_PROJECT_ID,
  res.locals.KOJI_PROJECT_TOKEN,
);
```

## Related resources

* [Package documentation](https://developer.withkoji.com/reference/packages/withkoji-koji-iap-package)
* [Reference project](https://withkoji.com/templates/sean/aoyl/code)
* [Koji homepage](http://withkoji.com/)

## Contributions and questions

See the [contributions page](https://developer.withkoji.com/docs/about/contribute-koji-developers) on the developer site for info on how to make contributions to Koji repositories and developer documentation.

For any questions, reach out to the developer community or the `@Koji Team` on our [Discord server](https://discord.gg/eQuMJF6).
