import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Blog from "@/models/blog.model";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { validateBody } from "@/utils/validateRequest";
import { blogCreateSchema } from "@/validators/blog.validator";


export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(50, parseInt(searchParams.get("limit")) || 10);
    const skip = (page - 1) * limit;
    const publishedParam = searchParams.get("published");

    // Build filter object
    const filter = {};
    
    // Add published filter
    if (publishedParam === "true") {
      filter.isPublished = true;
    }

    // Add category filter (works with text search now)
    if (category) {
      filter.category = category;
    }

    // ✅ PARTIAL/FUZZY SEARCH: Matches single letters and partial words
    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), "i"); // Case-insensitive
      
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { content: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Projection (same for all queries)
    const projection = {
      title: 1,
      description: 1,
      content: 1,
      category: 1,
      tags: 1,
      thumbnail: 1,
      type: 1,
      duration: 1,
      createdAt: 1,
    };

    // Sort by date (newest first)
    const sortCriteria = { createdAt: -1 };

    // Execute query
    const blogs = await Blog.find(filter, projection)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count with same filter
    const total = await Blog.countDocuments(filter);

    return NextResponse.json(
      new ApiResponse(200, {
        count: blogs.length,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        blogs,
        searchQuery: query || null,
        categoryFilter: category || null,
      }),
      { status: 200}
    );
  } catch (error) {
    console.error("❌ GET /api/blog error:", error);
    return NextResponse.json(
      new ApiError(500, error.message), 
      {
        status: 500,
      }
    );
  }
}

/* ---------------------------
   POST — Create Blog
---------------------------- */
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const validated = await validateBody(blogCreateSchema, body);
    if (validated instanceof NextResponse) return validated;

    console.log("📥 VALIDATED BODY:", validated);

    const {
      title,
      description = "",
      content,
      category,
      tags,
      thumbnail,
      thumbnailPublicId = "",
    } = validated;

    // Required fields
    if (
      !title?.trim() ||
      !content?.trim() ||
      !thumbnail?.trim() ||
      !Array.isArray(tags) ||
      tags.length === 0
    ) {
      throw new ApiError(
        400,
        "Title, content, thumbnail and at least one tag are required"
      );
    }

    const blog = await Blog.create({
      title,
      description,
      content,
      category,
      tags,
      thumbnail,
      thumbnailPublicId,
      isPublished: true,
    });

    console.log("📌 SAVED BLOG:", blog);

    return NextResponse.json(
      new ApiResponse(201, blog, "Blog created successfully"),
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ POST /api/blog error:", error);

    return NextResponse.json(
      new ApiError(error.statusCode || 500, error.message),
      { status: error.statusCode || 500 }
    );
  }
}
