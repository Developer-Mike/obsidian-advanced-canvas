import { TFile } from "obsidian";

this.prototype.computeFileMetadataAsync = function (file) {
  var that = this;
  if (file && file instanceof TFile) {
    this.uniqueFileLookup.add(file.name.toLowerCase(), file);

    var stats = file.stat,
      path = file.path,
      cache = null;

    if ("md" === file.extension) {
      if (this.fileCache.hasOwnProperty(path)) cache = this.fileCache[path];

      var isFresh = false;
      if (cache) {
        var unchanged =
            cache.mtime === stats.mtime && cache.size === stats.size,
          hasMetadataCache =
            cache.hash && this.metadataCache.hasOwnProperty(cache.hash);
        isFresh = unchanged && hasMetadataCache;
      } else {
        cache = {
          mtime: 0,
          size: 0,
          hash: "",
        };

        this.saveFileCache(path, cache);
      }

      if (!isFresh) {
        return (
          this.inProgressTaskCount++,
          this.workQueue.queue(function () {
            return y(that, void 0, void 0, function () {
              var o;
              return b(this, function (a) {
                switch (a.label) {
                  case 0:
                    return (
                      a.trys.push([0, 2, , 3]),
                      [
                        4,
                        y(that, void 0, void 0, function () {
                          var t, o, a, s, l;
                          return b(this, function (c) {
                            switch (c.label) {
                              case 0:
                                return [4, this.vault.readBinary(file)];
                              case 1:
                                return (
                                  (t = c.sent()),
                                  (o = bf(t)),
                                  [4, Ef(t)]
                                );
                              case 2:
                                if (
                                  ((a = c.sent()),
                                  (cache.mtime = stats.mtime),
                                  (cache.size = stats.size),
                                  (cache.hash = a),
                                  this.saveFileCache(path, cache),
                                  (s = this.metadataCache[a]))
                                )
                                  return (
                                    this.queueFileForLinkResolution(file),
                                    this.trigger("changed", file, o, s),
                                    [2]
                                  );
                                ((l = setTimeout(function () {
                                  new db(
                                    "Indexing taking a long time for " +
                                      file.path,
                                  );
                                }, 1e4)),
                                  (c.label = 3));
                              case 3:
                                return (
                                  c.trys.push([3, , 5, 6]),
                                  [4, this.work(t)]
                                );
                              case 4:
                                return ((s = c.sent()), [3, 6]);
                              case 5:
                                return (clearTimeout(l), [7]);
                              case 6:
                                return s
                                  ? (this.saveMetaCache(a, s),
                                    this.queueFileForLinkResolution(file),
                                    this.trigger("changed", file, o, s),
                                    [2])
                                  : (console.log(
                                      "Metadata failed to parse",
                                      file,
                                    ),
                                    [2]);
                            }
                          });
                        }),
                      ]
                    );
                  case 1:
                    return (a.sent(), [3, 3]);
                  case 2:
                    return ((o = a.sent()), console.error(o), [3, 3]);
                  case 3:
                    return (
                      this.inProgressTaskCount--,
                      0 === this.inProgressTaskCount && this.didFinish(),
                      [2]
                    );
                }
              });
            });
          })
        );
      }

      this.queueFileForLinkResolution(file);
    } else
      this.saveFileCache(path, {
        mtime: stats.mtime,
        size: stats.size,
        hash: "",
      });
  }
};

///////////////////

switch (a.label) {
  case 0:
    return (
      a.trys.push([0, 2, , 3]),
      [
        4,
        y(that, void 0, void 0, function () {
          var t, o, a, s, l;
          return b(this, function (c) {
            switch (c.label) {
              case 0:
                return [4, this.vault.readBinary(file)];
              case 1:
                return ((t = c.sent()), (o = bf(t)), [4, Ef(t)]);
              case 2:
                if (
                  ((a = c.sent()),
                  (cache.mtime = stats.mtime),
                  (cache.size = stats.size),
                  (cache.hash = a),
                  this.saveFileCache(path, cache),
                  (s = this.metadataCache[a]))
                )
                  return (
                    this.queueFileForLinkResolution(file),
                    this.trigger("changed", file, o, s),
                    [2]
                  );
                ((l = setTimeout(function () {
                  new db(
                    "Indexing taking a long time for " + file.path,
                  );
                }, 1e4)),
                  (c.label = 3));
              case 3:
                return (c.trys.push([3, , 5, 6]), [4, this.work(t)]);
              case 4:
                return ((s = c.sent()), [3, 6]);
              case 5:
                return (clearTimeout(l), [7]);
              case 6:
                return s
                  ? (this.saveMetaCache(a, s),
                    this.queueFileForLinkResolution(file),
                    this.trigger("changed", file, o, s),
                    [2])
                  : (console.log("Metadata failed to parse", file),
                    [2]);
            }
          });
        }),
      ]
    );
  case 1:
    return (a.sent(), [3, 3]);
  case 2:
    return ((o = a.sent()), console.error(o), [3, 3]);
  case 3:
    return (
      this.inProgressTaskCount--,
      0 === this.inProgressTaskCount && this.didFinish(),
      [2]
    );
}
