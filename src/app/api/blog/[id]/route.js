import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Blog from "@/models/blog.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import cloudinary from "@/lib/cloudinary";
import mongoose from "mongoose";
import { blogUpdateSchema } from "@/validators/blog.validator";
import { validateBody } from "@/utils/validateRequest";

/* GET /api/blog/[id] */
export async function GET(req, context) {
  try {
    await connectToDB();
    
    // ✅ CORRECT WAY: Await params first, then destructure
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID"), { status: 400 });
    }

    const blog = await Blog.findById(id)
      .select("title content thumbnail description category tags createdAt isPublished duration")
      .lean();

    if (!blog) {
      return NextResponse.json(new ApiError(404, "Blog not found"), { status: 404 });
    }

    return NextResponse.json(new ApiResponse(200, blog, "Blog fetched"), { status: 200 });

  } catch (error) {
    console.error("GET ERROR:", error);
    return NextResponse.json(new ApiError(500, error.message), { status: 500 });
  }
}

/* PUT /api/blog/[id] */
export async function PUT(req, context) {
  try {
    await connectToDB();
    
    // ✅ CORRECT WAY: Await params first, then destructure
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID"), { status: 400 });
    }

    const body = await req.json();
    const validated = await validateBody(blogUpdateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const allowed = [
      "title",
      "content",
      "thumbnail",
      "thumbnailPublicId",
      "category",
      "tags",
      "description",
      "isPublished",
      "duration"
    ];

    const updates = Object.fromEntries(
      Object.entries(validated).filter(([k]) => allowed.includes(k))
    );

    const blog = await Blog.findById(id);
    if (!blog) {
      return NextResponse.json(new ApiError(404, "Blog not found"), { status: 404 });
    }

    // cloudinary cleanup
    if (
      updates.thumbnail &&
      blog.thumbnailPublicId &&
      updates.thumbnailPublicId !== blog.thumbnailPublicId
    ) {
      cloudinary.uploader.destroy(blog.thumbnailPublicId).catch(console.error);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true, runValidators: true }
    );

    return NextResponse.json(new ApiResponse(200, updatedBlog, "Blog updated"), {
      status: 200
    });

  } catch (error) {
    console.error("PUT ERROR:", error);
    return NextResponse.json(new ApiError(500, error.message), { status: 500 });
  }
}

/* DELETE /api/blog/[id] */
export async function DELETE(req, context) {
  try {
    await connectToDB();
    
    // ✅ CORRECT WAY: Await params first, then destructure
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(new ApiError(400, "Invalid blog ID"), { status: 400 });
    }

    const deleted = await Blog.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json(new ApiError(404, "Blog not found"), { status: 404 });
    }

    if (deleted.thumbnailPublicId) {
      cloudinary.uploader.destroy(deleted.thumbnailPublicId).catch(console.error);
    }

    return NextResponse.json(new ApiResponse(200, deleted, "Blog deleted"), {
      status: 200
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(new ApiError(500, error.message), { status: 500 });
  }
}