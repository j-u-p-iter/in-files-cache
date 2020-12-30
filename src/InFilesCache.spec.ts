import path from 'path';
import { readFile, outputFile, remove } from 'fs-extra';
import { InFilesCache } from './InFilesCache';

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
    describe('with fileContent', () => {
      it('extracts cached content according to the cacheParams', async () => {
        const fileContent = 'some content';
        const fileName = 'someFile.txt'
        const fileExtension = '.txt'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const cacheFolderName = inFilesCache.generateCacheFolderName(fileName); 

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(
          path.join(
            cacheFolderPath,
            cacheFolderName,
            cacheFileName
          ),
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
        const cacheFolderName = inFilesCache.generateCacheFolderName(fileName); 

        /**
         * Creates "real" file the class should read content from. 
         *
         */
        await outputFile(
          path.resolve(
            __dirname,
            '..',
            fileName,
          ),
          fileContent,
        );

        /**
         * Creates cache file with fileContent as InFilesCache does. 
         *
         */
        await outputFile(
          path.join(
            cacheFolderPath,
            cacheFolderName,
            cacheFileName
          ),
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
        const cacheFolderName = inFilesCache.generateCacheFolderName(fileName); 
       
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
          path.join(
            cacheFolderPath,
            cacheFolderName,
            cacheFileName
          ),
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
        const cacheFolderName = inFilesCache.generateCacheFolderName(fileName); 

        /**
         * Creates "real" file the class should read content from. 
         *
         */
        await outputFile(
          path.resolve(
            __dirname,
            '..',
            fileName,
          ),
          fileContent,
        );
       
        await inFilesCache.set({
          fileExtension,
          filePath: fileName,
        }, compiledFileContent);

        /**
         * Reads the content of the result cache file.
         *
         */
        const cacheFile = await readFile(
          path.join(
            cacheFolderPath,
            cacheFolderName,
            cacheFileName
          ),
          'utf8'
        );

        expect(cacheFile).toBe(compiledFileContent);

        await remove(cacheFolderPath);
      });
    });
  });
});
