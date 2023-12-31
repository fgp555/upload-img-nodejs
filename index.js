const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const app = express();
const port = 3000;

// Map to store image visit counts
const imageVisits = new Map();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Uploads will be stored in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uploadPath = path.join("uploads", file.originalname);

    // Check if file with the same name already exists
    fs.access(uploadPath, (err) => {
      if (!err) {
        // File exists, send a message or handle it as needed
        return cb(new Error("File with the same name already exists"));
      }

      // File does not exist, proceed with the upload
      cb(null, file.originalname);
    });
  },
});

const upload = multer({ storage: storage });

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// Route to display the HTML form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "read.html"));
});

app.get("/visits", (req, res) => {
  res.sendFile(path.join(__dirname, "visits.html"));
});

// Route to reset image visit counts
app.post("/reset-visit", (req, res) => {
  imageVisits.clear();
  res.send("Visit counts reset successfully!");
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "upload.html"));
});

// Route to handle image uploads (changed to use 'images' field for multiple files)
app.post("/upload", upload.array("images"), (req, res) => {
  res.send("Images uploaded successfully!");
});

// Route to retrieve a list of uploaded images
app.get("/images", (req, res) => {
  fs.readdir("uploads", (err, files) => {
    if (err) {
      return res.status(500).send("Error reading images");
    }
    res.json(files);
  });
});

// Route to delete an uploaded image
app.delete("/delete/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = `uploads/${filename}`;

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send("Error deleting image");
    }
    res.send("Image deleted successfully!");
  });
});

// Route to download all images as a zip file
app.get("/down", (req, res) => {
  const zipFileName = "images.zip";
  const output = fs.createWriteStream(zipFileName);
  const archive = archiver("zip");

  archive.pipe(output);

  // Add all files in the 'uploads' directory to the zip archive
  archive.directory("uploads", false);

  output.on("close", () => {
    res.download(zipFileName, (err) => {
      if (err) {
        console.error(`Error downloading zip file: ${err.message}`);
        res.status(500).send("Error downloading zip file");
      } else {
        // Cleanup: Remove the temporary zip file after sending
        fs.unlink(zipFileName, (err) => {
          if (err) {
            console.error(`Error deleting temporary zip file: ${err.message}`);
          }
        });
      }
    });
  });

  archive.finalize();
});

app.get("/visit", (req, res) => {
  const visitCounts = Array.from(imageVisits.entries()).map(([filename, count]) => ({
    filename,
    count,
  }));
  res.json(visitCounts);
});

// Route to open an image, increment visit count, and serve the image
app.get("/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = `uploads/${filename}`;

  // Increment visit count for the image
  const visits = imageVisits.get(filename) || 0;
  imageVisits.set(filename, visits + 1);

  res.sendFile(path.join(__dirname, filePath));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
