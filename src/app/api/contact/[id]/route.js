import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Contact from "@/models/contact.model";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";


export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}


export async function GET(req, context) {
  try {
    await connectToDB();

    const { id } = await context.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      return NextResponse.json(
        new ApiError(404, "Contact not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      new ApiResponse(200, contact, "Contact fetched"),
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      new ApiError(500, error.message),
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await connectToDB();

    const { id } = await params;
    const { status } = await req.json();

    if (!["pending", "resolved"].includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }

    const updated = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    return NextResponse.json(
      new ApiResponse(200, updated, "Status updated successfully"),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(new ApiError(500, error.message), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDB();
    const { id } =await params;

    const deleted = await Contact.findByIdAndDelete(id);

    if (!deleted) {
      throw new ApiError(404, "Contact not found");
    }

    return NextResponse.json(
      new ApiResponse(200, deleted, "Contact deleted successfully"),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return NextResponse.json(
      new ApiError(500, error.message),
      { status: 500, headers: corsHeaders }
    );
  }
}