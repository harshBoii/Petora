
'use client'

import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type CommunityGroup } from '@/lib/placeholder-data'
import { Users, Send, ChevronLeft, User, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/firebase'
import { doc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { PetLoader } from '@/components/pet-loader'

interface ChatMessage {
    id: string;
    user: string;
    userId: string;
    message: string;
    avatar: string;
    createdAt: Timestamp;
}

export default function GroupChatPage() {
    const params = useParams();
    const groupId = typeof params.id === 'string' ? params.id : '';
    const { toast } = useToast();
    const { user, profile } = useAuth();
    
    const [group, setGroup] = useState<CommunityGroup | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    
    const isMember = group?.memberIds?.includes(user?.uid || '');
    const isOwner = group?.ownerId === user?.uid;

    useEffect(() => {
        if (!groupId) return;

        const groupDocRef = doc(db, 'groups', groupId);
        const unsubscribeGroup = onSnapshot(groupDocRef, (doc) => {
            if(doc.exists()) {
                setGroup({ id: doc.id, ...doc.data() } as CommunityGroup);
            } else {
                notFound();
            }
            setIsLoading(false);
        });

        const messagesCol = collection(db, "groups", groupId, "messages");
        const q = query(messagesCol, orderBy("createdAt"));

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(fetchedMessages);
        });

        return () => {
            unsubscribeGroup();
            unsubscribeMessages();
        };
    }, [groupId]);

    const handleJoinGroup = async () => {
        if (!user || !group) {
            toast({ title: "You must be logged in to join", variant: "destructive" });
            return;
        }

        setIsJoining(true);
        try {
            const groupDocRef = doc(db, 'groups', group.id);
            await updateDoc(groupDocRef, {
                members: increment(1),
                memberIds: arrayUnion(user.uid)
            });
            toast({ title: `Welcome to ${group.name}!`, description: "You have successfully joined the group." });
        } catch (error) {
            console.error("Error joining group:", error);
            toast({ title: "Failed to join group", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };


    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user || !profile || !group) {
            toast({ title: "You must be logged in to chat", variant: "destructive" });
            return;
        }

        const messagesCol = collection(db, "groups", group.id, "messages");
        await addDoc(messagesCol, {
            user: profile.displayName,
            userId: user.uid,
            message: newMessage,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.displayName}`,
            createdAt: serverTimestamp()
        });

        setNewMessage('');
    }
    
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 h-[calc(100vh-5rem)]">
                <PetLoader />
                <p className="text-muted-foreground">Loading group chat...</p>
            </div>
        )
    }

    if (!group) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-5rem)]">
            <div className="mb-6 flex-shrink-0">
                <Button asChild variant="outline">
                    <Link href="/community">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Community
                    </Link>
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 flex-1 min-h-0">
                <div className="lg:col-span-1">
                    <Card className="h-full overflow-y-auto">
                        <CardHeader className="p-0">
                             <div className="relative h-48 w-full">
                                <Image
                                    src={group.imageUrl}
                                    alt={`Image for ${group.name}`}
                                    fill
                                    className="object-cover rounded-t-lg"
                                    data-ai-hint="pets community"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <CardTitle className="font-headline text-2xl mb-2">{group.name}</CardTitle>
                            <div className="flex items-center text-sm text-muted-foreground mb-4">
                                <Users className="h-4 w-4 mr-2 text-primary/70" />
                                {group.members} members
                            </div>
                            <CardDescription>{group.description}</CardDescription>
                            
                            {user && !isMember && !isOwner && (
                                <Button className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleJoinGroup} disabled={isJoining}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {isJoining ? 'Joining...' : 'Join Group'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Group Chat</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-6 pt-0 min-h-0">
                             <ScrollArea className="flex-1 pr-4 -mr-4 mb-4">
                                <div className="space-y-6">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user?.uid ? 'justify-end' : ''}`}>
                                            {msg.userId !== user?.uid && (
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={msg.avatar} alt={msg.user} />
                                                    <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${msg.userId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                {msg.userId !== user?.uid && <p className="font-semibold mb-1">{msg.user}</p>}
                                                <p>{msg.message}</p>
                                            </div>
                                             {msg.userId === user?.uid && (
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={msg.avatar} alt={msg.user} />
                                                    <AvatarFallback>
                                                        {profile?.displayName?.charAt(0) || <User />}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            {(isMember || isOwner) ? (
                                <form className="flex gap-2 border-t pt-4" onSubmit={handleSendMessage}>
                                    <Input 
                                      placeholder={user ? "Type your message..." : "Log in to join the chat"}
                                      className="flex-1"
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      disabled={!user || isLoading}
                                    />
                                    <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!newMessage.trim() || !user || isLoading}>
                                        <Send className="h-5 w-5" />
                                        <span className="sr-only">Send</span>
                                    </Button>
                                </form>
                            ) : (
                                <div className="text-center text-muted-foreground border-t pt-6">
                                    <p>You must join the group to participate in the chat.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
