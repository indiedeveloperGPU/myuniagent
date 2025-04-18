if (typeof window !== "undefined") {
    const { GlobalWorkerOptions } = require("pdfjs-dist/build/pdf");
    GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.js";
  }
  