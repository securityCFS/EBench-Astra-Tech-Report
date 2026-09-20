# How Frontier Large Language Models Reshape Embodied Policies

A Comprehensive Evaluation of GPT-6-Astra on EBench.

## Local preview

Requires Node.js and Git LFS. Website source: `dist/`.

```sh
git lfs pull --include="dist/media/**"
npm run dev
```

Open http://127.0.0.1:4173/.

## Deploy

The live report is published from branch `001` at https://securitycfs.github.io/Ebench-Astra-Tech-Report/.

In Settings → Pages, select **GitHub Actions**. Each push to `001` automatically runs **Deploy report to GitHub Pages**. The workflow can also be run manually from the Actions tab by selecting branch `001`.

The workflow validates the site and publishes its pages, data and videos. Unfinished PDFs are excluded.
