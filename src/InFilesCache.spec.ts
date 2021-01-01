import path from 'path';
import { readFile, outputFile, remove, existsSync } from 'fs-extra';
import { InFilesCache } from '.';


describe('InFilesCache', () => {
  describe('generateHash(content)', () => {
    it('generates 10 length characters hash string', () => {
      const inFilesCache = new InFilesCache('./somePath');

      const generatedHash = inFilesCache.generateHash('some content');

      expect(typeof generatedHash).toBe('string');
      expect(generatedHash).toHaveLength(10);
    });
  });

  describe('get(cacheParams)', () => {
    it('returns null if there is no such a cache file', async () => {
      const fileContent = 'some content';
      const fileName = 'someFolder/someFile.txt'
      const fileExtension = '.txt'

      const cacheFolderPath = path.join(__dirname, '../src/cache');
      const inFilesCache = new InFilesCache(cacheFolderPath);

      /**
        * Here we pass fileContent, because the file is "virtual",
        *   but we need fileContent to generate correct result fileName.
        *
        */
      const resultCacheFileContent = await inFilesCache.get({
        filePath: fileName,
        fileContent,
        fileExtension,
      });

      expect(resultCacheFileContent).toBe(null);
    });

    it('throws an error if there are some issues with reading a cache file', async () => {
      const fileContent = 'some content';
      const fileName = 'someFolder/someFile.txt'
      const fileExtension = '.txt'

      const cacheFolderPath = path.join(__dirname, '../src/cache');
      const inFilesCache = new InFilesCache(cacheFolderPath);
      const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);

      /**
        * Creates cache file with fileContent as InFilesCache does. 
        *
        */
      await outputFile(
        `./src/cache/someFile/${cacheFileName}`,
        fileContent,
      );

      /**
        * Here we pass fileContent, because the file is "virtual",
        *   but we need fileContent to generate correct result fileName.
        *
        */
      const resultCacheFileContent = await inFilesCache.get({
        filePath: fileName,
        fileContent,
        fileExtension,
      });

      expect(resultCacheFileContent).toBe(null);
    });

    describe('with fileContent', () => {
      it('extracts cached content according to the cacheParams', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(
          `./src/cache/someFile/${cacheFileName}`,
          fileContent,
        );

        /**
         * Here we pass fileContent, because the file is "virtual",
         *   but we need fileContent to generate correct result fileName.
         *
         */
        const resultCacheFileContent = await inFilesCache.get({
          filePath: fileName,
          fileContent,
          fileExtension,
        });

        expect(resultCacheFileContent).toBe(fileContent);

        await remove(cacheFolderPath);
      });
    });

    describe('without fileContent', () => {
      it('extracts cached content according to the cacheParams', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const realFilePath = path.resolve(__dirname, '..', fileName);

        /**
         * Creates "real" file the class should read content from. 
         *
         */
        await outputFile(realFilePath, fileContent);

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(
          `./src/cache/someFile/${cacheFileName}`,
          fileContent,
        );

        /**
         * Here we do not pass fileContent, because the file is "real",
         *   and class should read it from the file itself.
         *
         */
        expect(await inFilesCache.get({
          filePath: fileName,
          fileExtension,
        })).toBe(fileContent);

        await remove(cacheFolderPath);
      });

      it('throws an error if there is no such a file', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile1.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);

        /**
         * Creates cache file with fileContent 
         *   as InFilesCache does. 
         *
         */
        await outputFile(
          `./src/cache/someFile/${cacheFileName}`,
          fileContent,
        );

        /**
         * Here we do not pass fileContent, because the file is "real",
         *   and class should read it from the file itself.
         *
         */
        await expect(inFilesCache.get({
          filePath: fileName,
          fileExtension,
        })).rejects.toThrow('There is no such a file: someFile1.txt');
      });
    });
  });

  describe('set(cacheParams, contentToCache)', () => {
    describe('with fileContent', () => {
      it('sets content to cache according to the cacheParams', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'
        const compiledFileContent = 'some compiled content';

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
       
        /**
         * Here we pass fileContent, because the file is "virtual",
         *   but we need fileContent to generate correct result fileName.
         *
         */
        await inFilesCache.set({
          fileContent,
          fileExtension,
          filePath: fileName,
        }, compiledFileContent);

        /**
         * Reads the content of the result cache file.
         *
         */
        const cacheFile = await readFile(
          `./src/cache/someFile/${cacheFileName}`,
         'utf8'
        ); 

        expect(cacheFile).toBe(compiledFileContent);

        await remove(cacheFolderPath);
      });
    });

    describe('without fileContent', () => {
      it('sets content to cache according to the cacheParams', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'
        const compiledFileContent = 'some compiled content';

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const realFilePath = path.resolve(__dirname, '..', fileName);

        /**
         * Creates "real" file the class should read content from. 
         *
         */
        await outputFile(realFilePath, fileContent);
       
        await inFilesCache.set({
          fileExtension,
          filePath: fileName,
        }, compiledFileContent);

        /**
         * Reads the content of the result cache file.
         *
         */
        const cacheFile = await readFile(
          `./src/cache/someFile/${cacheFileName}`,
          'utf8'
        );

        expect(cacheFile).toBe(compiledFileContent);

        await remove(cacheFolderPath);

        await remove(realFilePath); 
      });

      it('throws an error if there is no such a file', async () => {
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'
        const compiledFileContent = 'some compiled content';

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);

        await expect(inFilesCache.set({
          fileExtension,
          filePath: fileName,
        }, compiledFileContent)).rejects.toThrow('There is no such a file: someFile.txt');
      });
    });
  });

  describe('clear()', () => {
    describe('with fileContent', () => {
      it('removes cache for file', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const cacheFilePath = `./src/cache/someFile/${cacheFileName}`;

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(cacheFilePath, fileContent);

        /**
         * We need to be sure, that we've definitely
         *   created the file with the cache
         *
         */
        expect(existsSync(cacheFilePath)).toBe(true);

        /**
         * Here we pass fileContent, because the file is "virtual",
         *   but we need fileContent to generate correct result fileName.
         *
         */
        await inFilesCache.clear({
          filePath: fileName,
          fileContent,
          fileExtension,
        });

        expect(existsSync(cacheFilePath)).toBe(false);

        await remove(cacheFolderPath);
      });
    });

    describe('without fileContent', () => {
      it('removes cache for file', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const cacheFilePath = `./src/cache/someFile/${cacheFileName}`;
        const realFilePath = path.resolve(__dirname, '..', fileName);

        /**
         * Creates "real" file the class should read content from. 
         *
         */
        await outputFile(realFilePath, fileContent);

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(cacheFilePath, fileContent);

        /**
         * We need to be sure, that we've definitely
         *   created the file with the cache
         *
         */
        expect(existsSync(cacheFilePath)).toBe(true);

        /**
         * Here we pass fileContent, because the file is "virtual",
         *   but we need fileContent to generate correct result fileName.
         *
         */
        await inFilesCache.clear({
          filePath: fileName,
          fileExtension,
        });

        expect(existsSync(cacheFilePath)).toBe(false);

        await remove(cacheFolderPath);
        await remove(realFilePath);
      });
    });
  });
});
