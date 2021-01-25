import { findPathToFile } from "@j.u.p.iter/find-path-to-file";
import { SystemErrorCode } from "@j.u.p.iter/system-error-code";
import crypto from "crypto";
import { outputFileSync, readFileSync, removeSync } from "fs-extra";
import path from "path";

/**
 * Cache params are params we use to create file paths
 *   for files with cache. These are the next params:
 *
 * - filePath - path to the original file (virtual or real);
 *
 * - fileContent - content of the original file, compiled version of which we want to cache;
 *
 * - fileExtension - result extension of the cache file we want to read/write. We need to pass
 *   it, cause the original "real" file and the result cache file can have different extension.
 *   For example, the original file has ".ts" extension and the result file has ".js" extension.
 *   If the file is "virtual", in many cases, there's no extension at all.
 *
 */

/**
 * TODO: fileExtension should be used from filePath
 *   (for both, virtual and real, files) if fileXtension is not provided.
 *
 */
export interface CacheParams {
  /**
   * filePath should be relative to the cacheFolderPath
   *
   */
  filePath: string;
  fileContent?: string;
  fileExtension: string;
}

/**
 * The class supposes to work with two different types of files.
 *
 * The first type is called "virtual". This is the type, that doesn't present
 *   in the file system and content for this file comes from user's input (for example, from repl).
 *   In this case we still need some file path (let's say file id) to create reasonable file path
 *   for the file with cache. So, the user of this class still need to pass some file path for
 *   the content we want to cache.
 *
 * The second type is called "real". This is the type, that really presents in the file system.
 *   In this case we don't provide file's content to the methods we use to work with cache,
 *   when we need to read/write cache. The class tries to read this content internally.
 *
 * So, one more time:
 *   - for the "virtual" types of files we should provide both file path and
 *     file content params to generate correct file path to the result file with cache;
 *
 *   - for the "real" types of files we should provide only file path, because the
 *     content will be read by the system internally.
 *
 */

export class InFilesCache {
  /**
   * An absolute path to the root project folder.
   *
   */
  private appRootPath = null;

  private readFile(filePath) {
    try {
      const fileContent = readFileSync(filePath, "utf8");

      return fileContent;
    } catch (error) {
      if (error.code === SystemErrorCode.NO_FILE_OR_DIRECTORY) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Cache folder path can be either absolute or relative
   *   (relative to the app root folder).
   *
   * We need to make it relative if it's absolute, to be
   *   able to work with this in a consistent way.
   *
   */
  private absolutePathToRelative(pathToModify, appRootFolderPath) {
    /**
     * appRootFolderPath is always absolute path.
     *   If pathToModify is also an absolute,
     *   we get the relative path to the app root folder in the end.
     *
     */
    return pathToModify.replace(appRootFolderPath, "");
  }

  private prepareCacheParams(
    originalCacheParams: CacheParams,
    appRootFolderPath
  ): CacheParams {
    const { filePath, fileContent, fileExtension } = originalCacheParams;

    /**
     * filePath can be eigher relative (to the app root folder) or absolute.
     *   We need to make it relative to be able to work with it in the consistent
     *   way in the end.
     *
     */
    const resultFilePath = this.absolutePathToRelative(
      filePath,
      appRootFolderPath
    );

    /**
     * For the "virtual" files we pass the content of the file
     *   explicitly, because in reality there's no such a file.
     *
     */
    const resultFileContent = fileContent
      ? fileContent
      : this.readFile(resultFilePath);

    /**
     * Content should be either passed as an argument
     *   or read from file by file path.
     *   If resultFileContent equals to null,
     *   it means, there's no such a "real" file.
     *   So, we throw an appropriate error.
     *
     */
    if (!resultFileContent) {
      throw new Error(`There is no such a file: ${resultFilePath}`);
    }

    return {
      fileExtension,
      filePath: resultFilePath,
      fileContent: resultFileContent
    };
  }

  /**
   * Detects the root path to the project by location of
   *   the "package.json" file internally.
   *
   */
  private async getAppRootFolderPath() {
    if (this.appRootPath) {
      return this.appRootPath;
    }

    const { dirPath } = await findPathToFile("package.json");

    this.appRootPath = dirPath;

    return this.appRootPath;
  }

  private async generatePathToFileCacheFolder(
    cacheParams: CacheParams
  ): Promise<string> {
    const fileCacheFolder = path.dirname(
      await this.generatePathToCacheFile(cacheParams)
    );

    return fileCacheFolder;
  }

  /**
   * The full absolute path the cache file consists of several main parts:
   *
   * - pathToAppRoot + pathToCacheFolder + cacheFolderName + cachedFileName.
   *
   * - pathToAppRoot - the path to the root folder of the application,
   *   that class determines internally;
   *
   * - pathToCacheFolder - path to the cache folder, that is passed
   *   to the class during it's initialization and, if it's necessary,
   *   modified from absolute to the relative to the app root;
   *
   * - cacheFolderName - the path to the folder for the concrete
   *   file, that is described recently;
   *
   * - cachedFileName - the name of the file, that contains the cache
   *   for the file with concrete path and content; if you update content -
   *   the new file will be created in the same cacheFolderName.
   *
   */
  private async generatePathToCacheFile(originalCacheParams: CacheParams) {
    const appRootFolderPath = await this.getAppRootFolderPath();

    const { filePath, fileExtension, fileContent } = this.prepareCacheParams(
      originalCacheParams,
      appRootFolderPath
    );

    /**
     * Cache file name depends on the fileContent.
     *   Everytime the file's content is updated, the
     *   new file will be created.
     *
     */
    const cacheFileName = this.generateCacheFileName(
      fileContent,
      fileExtension
    );
    const cacheFolderName = this.generateCacheFolderName(filePath);
    const cacheFolderPath = this.absolutePathToRelative(
      this.cacheFolderPath,
      appRootFolderPath
    );

    return path.join(
      appRootFolderPath,
      cacheFolderPath,
      cacheFolderName,
      cacheFileName
    );
  }

  /**
   * If filePath contains folders names,
   *   we connect folders names and file name with "-"
   *   to create cache folder name. Otherwise we just
   *   use file's name without extension as folder name.
   *
   * Let's say path to the file, compiled code of which we want to cache, looks like this:
   *   - /path/new-path/fileName.js
   *
   * The result folder name will look like this:
   *   - path-new-path-fileName
   *
   * All cache for this file will be stored into the folder with this name.
   *   If we need to drop the cache for this file we'll just remove this folder.
   *
   */
  private generateCacheFolderName(filePath) {
    /**
     * Replaces slash in the beginning.
     *   Otherwise tokens array will contain empty string as a first member.
     *
     */
    const tokens = filePath.replace(/\//, "").split("/");
    const fileName = tokens.pop();

    /**
     * removes file's extension, because in many cases
     *   an original file and a result file will have
     *   different extensions (Example: .tsx vs .js).
     *
     */
    const fileNameWithoutExtension = fileName.replace(/\.\w+/, "");

    return tokens.length
      ? `${tokens.join("-")}-${fileNameWithoutExtension}`
      : fileNameWithoutExtension;
  }

  /**
   * The cacheFolderPath should be relative to the
   *   application root folder or absolute.
   */
  constructor(private cacheFolderPath) {}

  /**
   * File names depend on fileContent.
   *   Cache for one file path but different contents should
   *   be stored in one common folder. It's necessary, cause
   *   in this case if we want to drop the cache for the concrete file,
   *   it will be enough just to remove this common folder.
   *
   * We expose this method for testing purposes.
   *
   */
  public generateCacheFileName(fileContent, fileExtension) {
    return `${this.generateHash(fileContent)}${fileExtension}`;
  }

  /**
   * Hash is used to create files with hashed file
   *   names to avoid collisions. File name should depend on
   *   the original content of the file and path to the file.
   *   In this case if the content of the file or path to the
   *   file hasn't been changed, we'll always have already compiled
   *   version of the code for the given file path.
   *
   * We make this method public, because we need
   *   to use this method in tests, to write good tests.
   *
   */
  public generateHash(content: CacheParams["fileContent"]) {
    /**
     * Here we're creating hash instance (instance, that is used to create hashes)
     *   after we set up content to create hash from and digest method with "hex"
     *   encoding creates hash. While MD5 is not appropriate for verification of
     *   untrusted data, it does provide uniform distribution
     *   (https://stackoverflow.com/questions/8184941/uniform-distribution-of-truncated-md5/8199245#8199245)
     *   when truncated and if we use the first 32 bits, there will be a 1 in 3,506,097 chance
     *   of a collision if we have 50 revisions of the same file.
     *   That seems to be pretty good odds for most sites.
     *   In our case we truncate to 10 symbols (40 bits), that seems more than
     *   enough.
     */
    return crypto
      .createHash("md5")
      .update(content)
      .digest("hex")
      .slice(0, 10);
  }

  public async get(cacheParams: CacheParams) {
    const pathToCacheFile = await this.generatePathToCacheFile(cacheParams);

    return this.readFile(pathToCacheFile);
  }

  public async set(cacheParams: CacheParams, contentToCache: string) {
    const pathToCacheFile = await this.generatePathToCacheFile(cacheParams);

    return outputFileSync(pathToCacheFile, contentToCache);
  }

  public async clear(cacheParams: CacheParams) {
    const fileCacheFolder = await this.generatePathToFileCacheFolder(
      cacheParams
    );

    return removeSync(fileCacheFolder);
  }
}
