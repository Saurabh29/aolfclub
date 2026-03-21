import { ulid } from "ulid";
import type { Location } from "~/lib/schemas/domain";

const CENTRES = [
  {
    name: "Bangalore South Centre",
    slug: "bangalore-south",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    countryCode: "IN",
    address: "14 Jayanagar 4th Block, Bengaluru",
    zipCode: "560041",
    lat: 12.9252,
    lng: 77.5938,
    placeId: "ChIJVRFjrSsUrjsRHX2B9pJZPAg",
    formattedAddress: "14 Jayanagar 4th Block, Bengaluru, Karnataka 560041, India",
    phone: "+91 80 2663 1234",
    email: "blr.south@aolfclub.org",
    capacity: 120,
    description: "Flagship Bangalore South centre running weekly yoga and meditation programs.",
  },
  {
    name: "Delhi NCR Centre",
    slug: "delhi-ncr",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    countryCode: "IN",
    address: "Plot 22, Vasant Kunj, New Delhi",
    zipCode: "110070",
    lat: 28.5273,
    lng: 77.1562,
    placeId: "ChIJLbZ-NFoaDTkRQJY4FbcFcgM",
    formattedAddress: "Plot 22, Vasant Kunj, New Delhi, Delhi 110070, India",
    phone: "+91 11 4560 7890",
    email: "delhi@aolfclub.org",
    capacity: 200,
    description: "Delhi NCR centre offering Teacher Training and Pranayama workshops.",
  },
  {
    name: "Mumbai Andheri Centre",
    slug: "mumbai-andheri",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    countryCode: "IN",
    address: "7 Andheri West, Mumbai",
    zipCode: "400058",
    lat: 19.1136,
    lng: 72.8697,
    placeId: "ChIJXS2IIhDKwjsRp2mvkl3L2pI",
    formattedAddress: "7 Andheri West, Mumbai, Maharashtra 400058, India",
    phone: "+91 22 2673 4455",
    email: "mumbai.andheri@aolfclub.org",
    capacity: 80,
    description: "Compact centre focused on Holistic Wellness and Ayurveda programs.",
  },
  {
    name: "Chennai RA Puram",
    slug: "chennai-ra-puram",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    address: "5 R.A. Puram, Chennai",
    zipCode: "600028",
    lat: 13.0316,
    lng: 80.2642,
    placeId: "ChIJkxHJsZZnUjoRCsBg7Zi3vAo",
    formattedAddress: "5 R.A. Puram, Chennai, Tamil Nadu 600028, India",
    phone: "+91 44 2461 3322",
    email: "chennai@aolfclub.org",
    capacity: 100,
    description: "Chennai centre with morning and evening yoga batches.",
  },
];

/**
 * Generate realistic dummy locations for testing
 */
export function generateDummyLocations(count: number): Location[] {
  const now = Date.now();

  return CENTRES.slice(0, Math.min(count, CENTRES.length)).map((c, i) => {
    const createdDate = new Date(now - (CENTRES.length - i) * 30 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);

    return {
      id: ulid(),
      slug: c.slug,
      name: c.name,
      description: c.description,
      placeId: c.placeId,
      formattedAddress: c.formattedAddress,
      lat: c.lat,
      lng: c.lng,
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      country: c.country,
      countryCode: c.countryCode,
      phone: c.phone,
      email: c.email,
      capacity: c.capacity,
      isActive: i !== CENTRES.length - 1, // last centre inactive for demo
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
    };
  });
}

