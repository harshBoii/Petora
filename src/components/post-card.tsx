'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Post, Comment } from '@/lib/placeholder-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, User } from 'lucide-react'
import { Separator } from './ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'

interface PostCardProps {
    post: Post
}

export function PostCard({ post }: PostCardProps) {
    const { user, profile, isLoading } = useAuth();
    const [isLiked, setIsLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
    const [postComments, setPostComments] = useState<Comment[]>(post.comments || [])
    const [newComment, setNewComment] = useState('')
    const { toast } = useToast()

    useEffect(() => {
        if (user) {
            setIsLiked(post.likes?.includes(user.uid) ?? false);
        } else {
            setIsLiked(false);
        }
        setLikeCount(post.likes?.length ?? 0);
        setPostComments(post.comments ?? []);
    }, [post, user])

    const handleLikeClick = async () => {
        if (!user) {
            toast({ title: "Login to like posts", variant: "destructive"})
            return;
        }

        const postRef = doc(db, 'posts', post.id);
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked); // Optimistic update
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
        
        try {
            if (newIsLiked) {
                await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayRemove(user.uid) });
            }
        } catch (error) {
            // Revert optimistic update on error
            setIsLiked(!newIsLiked);
            setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
            console.error("Error updating like:", error);
            toast({ title: "Something went wrong.", variant: "destructive"})
        }
    }

    const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (newComment.trim() === '' || !user || !profile) {
            if (!user) toast({ title: "Login to comment", variant: "destructive"})
            return;
        };

        const comment: Comment = {
            id: `c${Date.now()}`,
            author: profile.displayName,
            authorId: user.uid,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.displayName}`,
            comment: newComment.trim(),
            createdAt: Timestamp.now(),
        }
        
        const postRef = doc(db, 'posts', post.id);

        try {
            await updateDoc(postRef, { comments: arrayUnion(comment) });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
            toast({ title: "Could not add comment.", variant: "destructive"})
        }
    }
    
    const handleShareClick = async () => {
        const postUrl = `${window.location.origin}/community/post/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out this post by ${post.author} on Petora Connect`,
                    text: post.content,
                    url: postUrl,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(postUrl);
                toast({
                    title: "Link Copied!",
                    description: "The post link has been copied to your clipboard.",
                });
            } catch (error) {
                console.error('Failed to copy:', error);
                toast({
                    title: "Oops!",
                    description: "Could not copy the link to your clipboard.",
                    variant: "destructive"
                });
            }
        }
    }

    const getTimestamp = () => {
        if (!post.createdAt) return "Just now";
        try {
            return `${formatDistanceToNow(post.createdAt.toDate())} ago`;
        } catch (e) {
            return "Just now";
        }
    }
    
    const getCommenterAvatar = () => {
        return user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.displayName || 'User'}`;
    }

    const getCommenterInitials = () => {
        return profile?.displayName?.charAt(0) || <User />;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-11 w-11 border">
                    <AvatarImage src={post.authorAvatar} alt={post.author} />
                    <AvatarFallback>{post.author?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <CardTitle className="text-base font-semibold">{post.author}</CardTitle>
                    <CardDescription>{getTimestamp()}</CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                </Button>
            </CardHeader>
            <CardContent>
                <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image src={post.imageUrl} alt="Post image" fill className="object-cover" data-ai-hint="pet post" />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 p-4">
                <div className="flex justify-between w-full text-sm text-muted-foreground">
                    <span>{likeCount} Likes</span>
                    <span>{postComments.length} Comments</span>
                </div>
                <Separator />
                <div className="grid grid-cols-3 w-full gap-2">
                    <Button variant="ghost" onClick={handleLikeClick}>
                        <Heart className={cn("mr-2 h-5 w-5", isLiked && "fill-red-500 text-red-500")} /> Like
                    </Button>
                    <Button variant="ghost" onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()}>
                        <MessageCircle className="mr-2 h-5 w-5" /> Comment
                    </Button>
                    <Button variant="ghost" onClick={handleShareClick}>
                        <Share2 className="mr-2 h-5 w-5" /> Share
                    </Button>
                </div>
                <Separator />
                <div className="w-full space-y-4">
                    {postComments.sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis()).map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={comment.avatar} alt={comment.author} />
                                <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="bg-muted rounded-lg px-3 py-2 text-sm w-full">
                                <p className="font-semibold">{comment.author}</p>
                                <p>{comment.comment}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <form className="flex w-full items-center gap-2 pt-2" onSubmit={handleCommentSubmit}>
                     <Avatar className="h-9 w-9 border">
                         <AvatarImage src={getCommenterAvatar()} alt={'User'} />
                         <AvatarFallback>{getCommenterInitials()}</AvatarFallback>
                     </Avatar>
                    <Input 
                      id={`comment-input-${post.id}`}
                      placeholder="Write a comment..." 
                      className="flex-1"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={!user}
                    />
                    <Button size="icon" variant="ghost" type="submit" disabled={!newComment.trim() || !user}>
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send comment</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}
