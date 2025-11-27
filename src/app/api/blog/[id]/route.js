import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Blog from "@/models/blog.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import cloudinary from "@/lib/cloudinary"; // ✅ Added
import mongoose from "mongoose";
import { blogUpdateSchema } from "@/validators/blog.validator";
import { validateBody } from "@/utils/validateRequest";
import { headers } from "next/headers";



/* ✅ GET /api/blog/[id]
   Fetch a single blog by ID
*/
export async function GET(req, context) {
  try {
    await connectToDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID format"), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const blog = await Blog.findById(id).lean();

    if (!blog) {
      return NextResponse.json(new ApiError(404, "Blog not found"), {
        status: 404,
        headers: corsHeaders,
      });
    }

    return NextResponse.json(
      new ApiResponse(200, blog, "Blog fetched successfully"),
      {
        status: 200,
        headers: corsHeaders,
      }
    );

  } catch (error) {
    console.error("GET /api/blog/[id] error:", error);
    return NextResponse.json(new ApiError(500, error.message), {
      status: 500,
     
    });
  }
}

/* ✅ PATCH /api/blog/[id]
   Update blog by ID (and delete old thumbnail if replaced)
*/

export async function PUT(req, context) {
  try {
    await connectToDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID format"), { status: 400 });
    }

    const body = await req.json();

    const validated = await validateBody(blogUpdateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const allowedFields = [
      "title",
      "content",
      "thumbnail",
      "thumbnailPublicId",
      "category",
      "tags",
      "redirectUrl",
      "description",
      "isPublished",
    ];

    const updates = Object.keys(validated)
      .filter((key) => allowedFields.includes(key))
      .reduce((acc, key) => {
        acc[key] = validated[key];
        return acc;
      }, {});

    const blog = await Blog.findById(id);
    if (!blog) {
      return NextResponse.json(new ApiError(404, "Blog not found"), { status: 404 });
    }

    // ✅ If new image uploaded, delete the old one
    if (
      updates.thumbnail &&
      blog.thumbnailPublicId &&
      updates.thumbnailPublicId !== blog.thumbnailPublicId
    ) {
      try {
        await cloudinary.uploader.destroy(blog.thumbnailPublicId);
      } catch (err) {
        console.error("❌ Cloudinary cleanup failed:", err);
      }
    }

    Object.assign(blog, updates);
    const updatedBlog = await blog.save();

    return NextResponse.json(
      new ApiResponse(200, updatedBlog, "Blog updated successfully"),
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/blog/[id] error:", error);
    return NextResponse.json(new ApiError(500, error.message), { status: 500 });
  }
}


/* ✅ DELETE /api/blog/[id]
   Delete blog by ID and remove its Cloudinary thumbnail
*/
export async function DELETE(req, context) {
  try {
    await connectToDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID format"), {
        status: 400,
      });
    }

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return NextResponse.json(new ApiError(404, "Blog not found"), {
        status: 404,
      });
    }

    // ✅ Delete Cloudinary thumbnail if exists
    if (deletedBlog.thumbnailPublicId) {
      try {
        await cloudinary.uploader.destroy(deletedBlog.thumbnailPublicId);
        console.log("🧹 Deleted from Cloudinary:", deletedBlog.thumbnailPublicId);
      } catch (err) {
        console.error("❌ Cloudinary deletion failed:", err);
      }
    }

    return NextResponse.json(
      new ApiResponse(200, deletedBlog, "Blog deleted successfully"),
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/blog/[id] error:", error);
    return NextResponse.json(new ApiError(500, error.message), { status: 500 });
  }
}
