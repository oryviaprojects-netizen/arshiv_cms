import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    searchTitle: {
      type: String,
      index: true, // FAST prefix search index!
    },

    content: { type: String, required: true },
    thumbnail: { type: String, default: "" },
    description: { type: String, default: "" },
    category: { type: String, default: "General", trim: true },
    thumbnailPublicId: { type: String },
    tags: { type: [String], default: [], index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Auto-create lower-case search field
BlogSchema.pre("save", function (next) {
  if (this.title) {
    this.searchTitle = this.title.toLowerCase();
  }
  next();
});


// FULL-TEXT INDEX ONLY FOR REAL SEARCH PAGE
BlogSchema.index(
  {
    title: "text",
    description: "text",
    content: "text",
    tags: "text",
    category: "text",
  },
  {
    weights: {
      title: 5,
      description: 3,
      tags: 3,
      category: 2,
      content: 1,
    },
  }
);



export default mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
