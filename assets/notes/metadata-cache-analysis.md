# Metadata Cache Analysis
## Problem
getCache(path) -> inbuilt function == "md"

### Solution
patch getCache(path)

## Problem
onCreateOrModify(TFile) -> file.extension == "md"
- No hash is generated for the file
- resolveLinks is not called for the canvas

### Solution
patch onCreateOrModify(TFile)
- Generate hash for the file
- Call resolveLinks for the canvas

## Problem
resolveLinks(TFile) -> doesn't process the canvas filetype

### Solution
patch resolveLinks(TFile)