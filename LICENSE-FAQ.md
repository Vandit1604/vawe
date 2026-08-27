---
when: asking what you may do with output from this repo
answers: "the licence in plain answers: commercial use, redistribution, the bundled assets"
group: project
---

# License FAQ

Vawe uses the **[Vawe Company License 1.0](LICENSE)**: a *source-available* license
in the spirit of [Fair Source](https://fair.io/) and the
[another engine](https://www.another engine.dev/docs/license) model. The short version:

> **Free for individuals and teams of 3 developers or fewer. Companies with more than 3
> developers need a paid license to use Vawe in production.**

## Who can use Vawe for free?

- **Individuals**: personal projects, learning, research, side projects. Always free.
- **Small teams**: any organization with **3 or fewer developers**, for any use including production.
- **Anyone, for non-production use**: evaluation, prototyping, development, and testing are free
  regardless of company size. Try it before you buy it.

## Who needs to pay?

- **Companies with more than 3 developers** that use Vawe **in production** (to render videos they
  ship, publish, or sell). If that's you, [reach out](#how-do-i-get-a-commercial-license) for a commercial license.

## Common questions

**Is this "open source"?**
Not in the OSI sense. The source is public, free to read, fork, and contribute to, but the license
restricts large-company production use. This is deliberate, it keeps the project sustainable and
lets it become a company later, the same choice another engine and many modern dev tools make.

**Can I use Vawe to make videos for my company's product?**
Yes. Rendering your *own* videos (even inside your own commercial product) is exactly what Vawe is
for and is permitted under the grant. The only thing you can't do without a separate agreement is
resell Vawe *itself* as a competing hosted video-rendering service.

**Can I fork it and contribute?**
Yes. Forking, modifying, and opening pull requests are all fine. Contributions are welcome.

**What about the fonts?**
No fonts are bundled with Vawe. `make fonts` downloads the free, openly-licensed faces (OFL/Apache)
from their own sources at build time. Paid faces (e.g. Söhne) are never distributed, you supply your
own copy locally.

**Does the license ever become fully open?**
Not automatically in 1.0. If that changes in a future version, it'll be announced here.

## How do I get a commercial license?

Email the maintainer (see the [README](README.md)) with your team size and use case.

---

*This FAQ is a plain-English summary and is not itself the license. The [LICENSE](LICENSE) file
governs. If you're relying on Vawe commercially, have your own counsel review it.*
