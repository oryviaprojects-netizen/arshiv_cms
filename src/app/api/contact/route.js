import { NextResponse } from "next/server";
import connectToDB from "@/lib/dbConnect";
import Contact from "@/models/contact.model";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import { sendEmail } from "@/utils/sendEmail";


/* ---------------------------
   OPTIONS (Preflight)
---------------------------- */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/* ---------------------------
   POST — Create Contact
---------------------------- */
export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { fullName, email, phone, message } = body;

    if (!fullName || !email || !message || !phone) {
      throw new ApiError(400, "Missing required fields");
    }
    console.log("bb",body);
    

    const saved = await Contact.create({
      fullName,
      email,
      phone,
      message,
    });

    console.log("ss",saved)

    await sendEmail({
      to: email,
      subject: `We received your query - `,
      html: `
        <h2>Hello ${fullName}</h2>
        <p>Your message has been received.</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });

    return new NextResponse(
      JSON.stringify(
        new ApiResponse(201, saved, "Contact saved successfully")
      ),
      {
        status: 201,
      }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify(new ApiError(500, error.message)),
      {
        status: 500,
      }
    );
  }
}
