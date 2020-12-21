import { findPathToFile } from "@j.u.p.iter/find-path-to-file";
import crypto from "crypto";
import { readFileSync } from "fs-extra";
import path from "path";

export interface CacheParams {
  /**
   * filePath should be relative to the cacheFolderPath
   */
  filePath: string;
  fileContent?: string;
  fileExtension: string;
}

/**
 * TODO: to extract into a separate package.
 */
export enum SystemErrorCode {
  /**
   * ENOENT (No such file or directory): Commonly raised by fs operations
   * to indicate that a component of the specified pathname does not exist.
   * No entity (file or directory) could be found by the given path.
   */
  NO_FILE_OR_DIRECTORY = "ENOENT"
}

export class InFilesCache {
  private readFile(filePath) {
    try {
      const fileContent = readFileSync(filePath);

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
   *   (relative the app root folder).
   *
   * We need to make it relative if it's absolute, to be
   *   able to work with this in consistent way.
   *
   */
  private prepareCacheFolderPath(appRootFolderPath) {
    /**
     * appRootFolderPath is always absolute path.
     *   If originalCacheFolderPath is also an absolute,
     *   we get the relative path as result.
     *
     */
    return this.cacheFolderPath.replace(appRootFolderPath, "");
  }

  private prepareCacheParams(originalCacheParams: CacheParams): CacheParams {
    const { filePath, fileContent, fileExtension } = originalCacheParams;

    const resultFileContent = fileContent
      ? fileContent
      : this.readFile(filePath);

    return {
      filePath,
      fileExtension,
      fileContent: resultFileContent
    };
  }

  /** 
   * Detects the root path to the project by location of 
   *   the "package.json" file internally.
   *
   */
  private async getAppRootFolderPath = () => {
    const { dirPath } = await findPathToFile("package.json");

    return dirPath;
  }

  /**
   * The full absolute path the cache file consists on several main parts:
   * - pathToAppRoot + pathToCacheFolder + fileToCacheFolder + cachedFileName.
   *
   * - pathToAppRoot - the path to the root folder of the application, 
   *   that class determines internally;
   *
   * - pathToCacheFolder - path to the cache folder, that is passed 
   *   to the class during it's initialization and, if it's necessary, 
   *   modified from absolute to the relative to the app root;
   *
   * - fileToCacheFolder - the path to the folder for the concrete 
   *   file, that is described recently;
   *
   * - cachedFileName - the name of the file, that contains the cache 
   *   for the file with concrete path and content; if you update content - 
   *   the new file will be generated in the same fileToCacheFolder.
   *
   */
  private async generatePathToCacheFile(originalCacheParams: CacheParams) {
    const { filePath, fileExtension, fileContent } = this.prepareCacheParams(
      originalCacheParams
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
    const appRootFolderPath = await getAppRootFolderPath();
    const cacheFolderPath = this.prepareCacheFolderPath(appRootFolderPath);

    return path.join(
      appRootFolderPath,
      cacheFolderPath,
      cacheFolderName,
      cacheFileName
    );
  }

  constructor(private cacheFolderPath) {}

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
   * We expose this method for testing purposes.
   */
  public generateCacheFolderName(filePath) {
    const tokens = filePath.split("/");
    const fileName = tokens.pop();

    // removes file's extension
    const fileNameWithoutExtension = fileName.replace(/\.\w+/, "");

    return tokens.length
      ? `${tokens.join("-")}-${fileNameWithoutExtension}`
      : fileNameWithoutExtension;
  }

  /**
   * File names depend on fileContent.
   *   Cache for one file path but different contents should
   *   be stored in one common folder. It's necessary, cause
   *   in this case if we want to drop the cache for the concrete file,
   *   it will be enough just to remove this common folder.
   *
   * We expose this method for testing purposes.
   */
  public generateCacheFileName(fileContent, fileExtension) {
    return `${this.generateHash(fileContent)}.${fileExtension}`;
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
}
