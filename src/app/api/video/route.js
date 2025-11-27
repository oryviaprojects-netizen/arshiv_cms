import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import Video from "@/models/video.model";
import { validateBody } from "@/utils/validateRequest";
import { videoCreateSchema } from "@/validators/video.validator";


export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

/* 
  ✅ GET /api/video
  Supports:
  - ?query=searchText (partial matching)
  - ?platform=youtube
  - ?category=General
  - ?page=1&limit=10
*/
export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const platform = searchParams.get("platform") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(50, parseInt(searchParams.get("limit")) || 10);
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };

    // Add platform filter
    if (platform) {
      filter.platform = platform;
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // ✅ PARTIAL/FUZZY SEARCH: Matches single letters and partial words
    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), "i"); // Case-insensitive
      
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Projection
    const projection = {
      title: 1,
      platform: 1,
      thumbnail: 1,
      redirectUrl: 1,
      description: 1,
      category: 1,
      tags: 1,
      createdAt: 1,
    };

    // Sort by date (newest first)
    const sortCriteria = { createdAt: -1 };

    const videos = await Video.find(filter, projection)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Video.countDocuments(filter);

    return NextResponse.json(
      new ApiResponse(200, {
        count: videos.length,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        videos,
        searchQuery: query || null,
        platformFilter: platform || null,
        categoryFilter: category || null,
      }, "Videos fetched successfully"),
      { status: 200}
    );
  } catch (error) {
    console.error("GET /api/video error:", error);
    return NextResponse.json(
      new ApiError(500, error.message),
      { status: 500 }
    );
  }
}


/* 
  ✅ POST /api/video
  Creates a new video entry
*/
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();

    // Zod validation
    const validated = await validateBody(videoCreateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const {
      title,
      thumbnail,
      platform,
      redirectUrl,
      description,
      category,
      tags,
      thumbnailPublicId = "",
    } = validated;

    // Manual required check
    if (!title?.trim() || !thumbnail?.trim() || !platform?.trim() || !redirectUrl?.trim()) {
      throw new ApiError(400, "All fields are required");
    }
if (!category) throw new ApiError(400, "Category is required");
if (!Array.isArray(tags) || tags.length === 0) {
  throw new ApiError(400, "At least one tag is required");
}

    // Unique URL check
    const exists = await Video.findOne({ redirectUrl }).select("_id").lean();
    if (exists) {
      throw new ApiError(409, "A video with this redirect URL already exists");
    }

    const video = await Video.create({
  title,
  thumbnail,
  platform,
  description,
  redirectUrl,
  category,
  tags,
  isActive: true,
  thumbnailPublicId,
});


    return NextResponse.json(
      new ApiResponse(201, { id: video._id }, "Video created successfully"),
      { status: 201 }
    );

  } catch (error) {
    console.error("POST /api/video error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

