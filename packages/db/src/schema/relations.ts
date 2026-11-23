import { relations } from "drizzle-orm"

import { adoptionApplication, successStory } from "./adoption.js"
import { account, session, user } from "./auth.js"
import { forumCategory, forumReply, forumReplyLike, forumTopic } from "./community.js"
import { post, postCategory, postTag, tag } from "./content.js"
import { breed, city, district, species } from "./dictionary.js"
import { favorite, listing, listingComment, listingImage, listingShareImage, savedSearch } from "./listing.js"
import { conversation, message } from "./messaging.js"
import { organization, orgClosures, orgHours } from "./organization.js"
import { notification } from "./system.js"

export const userRelations = relations(user, ({ one, many }) => ({
  city: one(city, { fields: [user.cityId], references: [city.id] }),
  organization: one(organization),
  sessions: many(session),
  accounts: many(account),
  listings: many(listing, { relationName: "listingOwner" }),
  favorites: many(favorite),
  savedSearches: many(savedSearch),
  notifications: many(notification),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

// --- Sözlük ---

export const cityRelations = relations(city, ({ many }) => ({
  districts: many(district),
}))

export const districtRelations = relations(district, ({ one }) => ({
  city: one(city, { fields: [district.cityId], references: [city.id] }),
}))

export const speciesRelations = relations(species, ({ many }) => ({
  breeds: many(breed),
}))

export const breedRelations = relations(breed, ({ one }) => ({
  species: one(species, { fields: [breed.speciesId], references: [species.id] }),
}))

// --- Kurum ---

export const organizationRelations = relations(organization, ({ one, many }) => ({
  user: one(user, { fields: [organization.userId], references: [user.id] }),
  city: one(city, { fields: [organization.cityId], references: [city.id] }),
  district: one(district, { fields: [organization.districtId], references: [district.id] }),
  hours: many(orgHours),
  closures: many(orgClosures),
}))

export const orgHoursRelations = relations(orgHours, ({ one }) => ({
  organization: one(organization, { fields: [orgHours.orgId], references: [organization.id] }),
}))

export const orgClosuresRelations = relations(orgClosures, ({ one }) => ({
  organization: one(organization, { fields: [orgClosures.orgId], references: [organization.id] }),
}))

// --- İlan ---

export const listingRelations = relations(listing, ({ one, many }) => ({
  owner: one(user, { fields: [listing.ownerId], references: [user.id], relationName: "listingOwner" }),
  species: one(species, { fields: [listing.speciesId], references: [species.id] }),
  breed: one(breed, { fields: [listing.breedId], references: [breed.id] }),
  city: one(city, { fields: [listing.cityId], references: [city.id] }),
  district: one(district, { fields: [listing.districtId], references: [district.id] }),
  images: many(listingImage),
  shareImages: many(listingShareImage),
  comments: many(listingComment),
  favorites: many(favorite),
  conversations: many(conversation),
  applications: many(adoptionApplication),
}))

export const listingImageRelations = relations(listingImage, ({ one }) => ({
  listing: one(listing, { fields: [listingImage.listingId], references: [listing.id] }),
}))

export const listingShareImageRelations = relations(listingShareImage, ({ one }) => ({
  listing: one(listing, { fields: [listingShareImage.listingId], references: [listing.id] }),
}))

export const favoriteRelations = relations(favorite, ({ one }) => ({
  user: one(user, { fields: [favorite.userId], references: [user.id] }),
  listing: one(listing, { fields: [favorite.listingId], references: [listing.id] }),
}))

export const listingCommentRelations = relations(listingComment, ({ one, many }) => ({
  listing: one(listing, { fields: [listingComment.listingId], references: [listing.id] }),
  author: one(user, { fields: [listingComment.authorId], references: [user.id] }),
  parent: one(listingComment, {
    fields: [listingComment.parentId],
    references: [listingComment.id],
    relationName: "commentThread",
  }),
  replies: many(listingComment, { relationName: "commentThread" }),
}))

export const savedSearchRelations = relations(savedSearch, ({ one }) => ({
  user: one(user, { fields: [savedSearch.userId], references: [user.id] }),
}))

// --- Sahiplenme ---

export const adoptionApplicationRelations = relations(adoptionApplication, ({ one }) => ({
  listing: one(listing, { fields: [adoptionApplication.listingId], references: [listing.id] }),
  applicant: one(user, { fields: [adoptionApplication.applicantId], references: [user.id] }),
}))

export const successStoryRelations = relations(successStory, ({ one }) => ({
  listing: one(listing, { fields: [successStory.listingId], references: [listing.id] }),
  author: one(user, { fields: [successStory.authorId], references: [user.id] }),
}))

// --- Mesajlaşma ---

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  listing: one(listing, { fields: [conversation.listingId], references: [listing.id] }),
  starter: one(user, { fields: [conversation.starterId], references: [user.id], relationName: "conversationStarter" }),
  owner: one(user, { fields: [conversation.ownerId], references: [user.id], relationName: "conversationOwner" }),
  messages: many(message),
}))

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, { fields: [message.conversationId], references: [conversation.id] }),
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
}))

// --- Topluluk ---

export const forumCategoryRelations = relations(forumCategory, ({ many }) => ({
  topics: many(forumTopic),
}))

export const forumTopicRelations = relations(forumTopic, ({ one, many }) => ({
  category: one(forumCategory, { fields: [forumTopic.categoryId], references: [forumCategory.id] }),
  author: one(user, { fields: [forumTopic.authorId], references: [user.id] }),
  replies: many(forumReply),
}))

export const forumReplyRelations = relations(forumReply, ({ one, many }) => ({
  topic: one(forumTopic, { fields: [forumReply.topicId], references: [forumTopic.id] }),
  author: one(user, { fields: [forumReply.authorId], references: [user.id] }),
  likes: many(forumReplyLike),
}))

export const forumReplyLikeRelations = relations(forumReplyLike, ({ one }) => ({
  reply: one(forumReply, { fields: [forumReplyLike.replyId], references: [forumReply.id] }),
  user: one(user, { fields: [forumReplyLike.userId], references: [user.id] }),
}))

// --- İçerik ---

export const postCategoryRelations = relations(postCategory, ({ many }) => ({
  posts: many(post),
}))

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  category: one(postCategory, { fields: [post.categoryId], references: [postCategory.id] }),
  tags: many(postTag),
}))

export const tagRelations = relations(tag, ({ many }) => ({
  posts: many(postTag),
}))

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.postId], references: [post.id] }),
  tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}))

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}))
