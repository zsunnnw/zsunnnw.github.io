## Overview

I used single-cell RNA sequencing to compare peripheral blood immune cells from people with pancreatic ductal adenocarcinoma and healthy controls. The analysis included 80,209 cells across 21 participants.

## Analysis

I used Seurat for single-cell analysis, Harmony for batch correction, and Azimuth for cell-type annotation. I compared gene expression within immune-cell populations and examined which biological pathways were enriched.

<figure class="project-figure">
    <img src="static/assets/projects/pdac-umap.jpg" alt="Two UMAP panels showing broad and finer immune-cell annotations after Harmony batch correction" width="1600" height="640" decoding="async">
    <figcaption>UMAP of peripheral blood immune cells at two levels of annotation.</figcaption>
</figure>

## Findings

The analysis highlighted differences in antimicrobial-response pathways in CD8 T cells and zinc homeostasis pathways in natural killer cells. These findings came from peripheral blood gene expression and can guide follow-up studies.
