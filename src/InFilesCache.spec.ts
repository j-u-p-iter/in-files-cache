import path from 'path';
import { outputFile } from 'fs-extra';
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
      it('extracts cached content according to the cacheParams', () => {
        const fileContent = 'some content';
        const fileName = 'someFile.json'
        const fileExtension = '.json'

        const cacheFolderPath = path.join(__dirname, '../src/cache');
        const inFilesCache = new InFilesCache(cacheFolderPath);
        const cacheFileName = inFilesCache.generateCacheFileName(fileContent, fileExtension);
        const cacheFolderName = inFilesCache.generateCacheFolderName(fileName); 

        outputFile(
          path.join(
            cacheFolderPath,
            cacheFolderName,
            cacheFileName
          ),
          fileContent,
        );

        expect(inFilesCache.get({
          filePath: fileName,
          fileContent,
          fileExtension,
        }));
      });
    });

    describe('without fileContent', () => {
      it('extracts cached content according to the cacheParams', () => {

      });
    });
  });
});
