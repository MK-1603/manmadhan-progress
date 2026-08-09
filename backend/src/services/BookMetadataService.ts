export class BookMetadataService {
  /**
   * Fetches metadata for a book from OpenLibrary API based on ISBN.
   */
  static async fetchFromOpenLibrary(isbn: string) {
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      if (!response.ok) return null;
      const data = await response.json();
      const bookData = data[`ISBN:${isbn}`];
      
      if (!bookData) return null;

      return {
        title: bookData.title,
        subtitle: bookData.subtitle,
        author: bookData.authors?.map((a: any) => a.name).join(", "),
        publicationDate: bookData.publish_date,
        publisher: bookData.publishers?.map((p: any) => p.name).join(", "),
        pageCount: bookData.number_of_pages,
        coverUrl: bookData.cover?.large || bookData.cover?.medium,
        sourceUrl: bookData.url,
        metadataProvider: "OpenLibrary",
        isbn10: bookData.identifiers?.isbn_10?.[0],
        isbn13: bookData.identifiers?.isbn_13?.[0],
      };
    } catch (e) {
      console.error("OpenLibrary fetch error:", e);
      return null;
    }
  }

  /**
   * Attempts to parse basic OpenGraph metadata from a generic URL.
   */
  static async fetchFromUrl(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const html = await response.text();

      const getMeta = (property: string) => {
        const match = html.match(new RegExp(`<meta\\s+(?:property|name)=["']${property}["']\\s+content=["'](.*?)["']`, 'i'));
        return match ? match[1] : null;
      };

      const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>(.*?)<\/title>/i)?.[1];
      const description = getMeta("og:description") || getMeta("description");
      const coverUrl = getMeta("og:image") || getMeta("twitter:image");
      const author = getMeta("author") || getMeta("book:author");
      const isbn = getMeta("book:isbn"); // Some sites include this

      return {
        title: title ? title.replace(/&amp;/g, '&').trim() : "Unknown Title",
        description: description ? description.replace(/&amp;/g, '&').trim() : undefined,
        coverUrl,
        author: author ? author.trim() : undefined,
        isbn13: isbn,
        sourceUrl: url,
        metadataProvider: "URL Scraper",
      };
    } catch (e) {
      console.error("URL scraper error:", e);
      return null;
    }
  }

  /**
   * Main orchestrator to discover a book based on a query (URL, ISBN, Title)
   */
  static async discoverBook(query: string) {
    // Is it a URL?
    if (query.startsWith("http://") || query.startsWith("https://")) {
      return this.fetchFromUrl(query);
    }
    
    // Is it an ISBN? (Basic clean up)
    const cleanIsbn = query.replace(/[-\s]/g, "");
    if (/^\d{10}$/.test(cleanIsbn) || /^\d{13}$/.test(cleanIsbn)) {
      return this.fetchFromOpenLibrary(cleanIsbn);
    }

    // Otherwise, generic search via OpenLibrary Search API
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) return null;
      const data = await response.json();
      
      if (data.docs && data.docs.length > 0) {
        const doc = data.docs[0];
        return {
          title: doc.title,
          author: doc.author_name?.join(", "),
          publicationDate: doc.first_publish_year?.toString(),
          publisher: doc.publisher?.[0],
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
          isbn10: doc.isbn?.[0],
          metadataProvider: "OpenLibrary Search",
        };
      }
    } catch (e) {
      console.error("OpenLibrary search error:", e);
    }

    return null;
  }
}
