
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc, DocumentData } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import type { Pet } from '@/lib/placeholder-data'
import { useAuth } from '@/hooks/use-auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, FileText, ShoppingCart, User } from 'lucide-react'
import { AuthRequired } from '@/components/auth-required'
import { PetLoader } from '@/components/pet-loader'

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [seller, setSeller] =useState<DocumentData | null>(null);
  const [isPetLoading, setIsPetLoading] = useState(true);

  const petId = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (petId) {
      const fetchPetAndSeller = async () => {
        setIsPetLoading(true);
        try {
          const petDocRef = doc(db, 'pets', petId);
          const petDocSnap = await getDoc(petDocRef);

          if (petDocSnap.exists()) {
            const petData = { id: petDocSnap.id, ...petDocSnap.data() } as Pet;
            setPet(petData);

            if (petData.ownerId) {
                const sellerDocRef = doc(db, 'users', petData.ownerId);
                const sellerDocSnap = await getDoc(sellerDocRef);
                if (sellerDocSnap.exists()) {
                    setSeller(sellerDocSnap.data())
                } else {
                    setSeller({ displayName: 'Anonymous', email: 'Not available' });
                }
            }
          } else {
            setPet(null);
          }
        } catch (error) {
            console.error("Error fetching data:", error)
            setPet(null);
        } finally {
            setIsPetLoading(false);
        }
      };
      fetchPetAndSeller();
    }
  }, [petId]);

  const handleConfirmPurchase = () => {
    toast({
        title: "Purchase Confirmed!",
        description: `Your request for ${pet?.name} has been submitted. The seller will contact you shortly.`,
    })
    router.push(`/pets/${petId}`);
  }

  if (isAuthLoading || isPetLoading) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center gap-4">
        <PetLoader />
        <p className="text-muted-foreground">Loading checkout...</p>
      </div>
    );
  }

  if (!pet) {
    notFound();
  }

  return (
    <AuthRequired>
      <div className="container mx-auto px-4 py-12 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <CardHeader className="text-center px-0 pb-8">
              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
                  <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl text-primary">Checkout</CardTitle>
              <CardDescription>Review the details below to complete your {pet.listingType === 'Sale' ? 'purchase' : 'adoption'}.</CardDescription>
          </CardHeader>

          <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="flex items-center gap-4">
                              <Image src={pet.imageUrl} alt={pet.name} width={100} height={100} className="rounded-lg object-cover border" />
                              <div>
                                  <h3 className="font-bold text-lg">{pet.name}</h3>
                                  <p className="text-muted-foreground">{pet.breed}</p>
                              </div>
                          </div>
                          <div className="flex justify-between items-center text-lg font-semibold pt-4 border-t">
                              <span>Total</span>
                              <span className="text-primary">{pet.price ? `₹${pet.price}` : 'Adoption Fee'}</span>
                          </div>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Seller Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <p><strong>Name:</strong> {seller?.displayName || 'N/A'}</p>
                          <p><strong>Email:</strong> {seller?.email || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground pt-2">The seller will contact you to arrange payment and pickup after confirmation.</p>
                      </CardContent>
                  </Card>
              </div>

              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Your Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <p><strong>Name:</strong> {profile?.displayName || ''}</p>
                          <p><strong>Email:</strong> {user?.email || ''}</p>
                      </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/>Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                          <p>By confirming, you agree to the terms of the {pet.listingType}. This will notify the seller of your interest.</p>
                          {pet.listingType === 'Sale' && <p><strong>Payment Method:</strong> Cash on Delivery</p>}
                          <Button size="lg" className="w-full font-bold bg-accent hover:bg-accent/90 text-accent-foreground mt-4" onClick={handleConfirmPurchase}>
                              Confirm {pet.listingType === 'Sale' ? 'Purchase' : 'Adoption'}
                          </Button>
                      </CardContent>
                  </Card>
              </div>
          </div>
        </div>
      </div>
    </AuthRequired>
  );
}
