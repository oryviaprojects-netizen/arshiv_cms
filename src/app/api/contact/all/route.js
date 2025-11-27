import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Contact from "@/models/contact.model";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";


export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    await connectToDB();

    const contacts = await Contact.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      new ApiResponse(200, contacts, "Contacts fetched successfully"),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(new ApiError(500, error.message), {
      status: 500,
     
    });
  }
}
