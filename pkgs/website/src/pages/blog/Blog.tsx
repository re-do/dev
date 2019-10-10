import React from "react"
import { Route, Switch, useParams } from "react-router-dom"
import { Card, Column, ErrorText } from "@re-do/components"
import { PostSummary } from "./PostSummary"
import { Post } from "./Post"
import { posts } from "./posts"
import { PostData } from "./common"

const getUrlSuffix = (post: PostData) =>
    post.title.replace(" ", "-").toLowerCase()

const PostContent = () => {
    const { title } = useParams()
    const matchingPost = posts.find(post => getUrlSuffix(post) === title)
    return matchingPost ? (
        <Post data={matchingPost} />
    ) : (
        <ErrorText>No post exists here</ErrorText>
    )
}

export const Blog = () => {
    return (
        <Card style={{ height: "100%", width: "100%" }}>
            <Switch>
                <Route path="/blog/:title">
                    <PostContent />
                </Route>
                <Route path="/blog">
                    <Column
                        style={{
                            padding: 16
                        }}
                    >
                        {posts.map(post => (
                            <PostSummary
                                key={post.title}
                                post={post}
                                linksTo={`/blog/${getUrlSuffix(post)}`}
                            />
                        ))}
                    </Column>
                </Route>
            </Switch>
        </Card>
    )
}
