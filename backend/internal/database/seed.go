package database

import (
	"log"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jmoiron/sqlx"
)

func SeedData(db *sqlx.DB) {
	// Check if data already exists
	var count int
	_ = db.Get(&count, "SELECT COUNT(*) FROM novels")
	if count > 0 {
		log.Println("⏩ Seed data already exists, skipping")
		return
	}

	tx, err := db.Beginx()
	if err != nil {
		log.Printf("Seed error: %v", err)
		return
	}

	// Seed genres
	genres := []struct {
		Name string
	}{
		{"Action"}, {"Adventure"}, {"Fantasy"}, {"Romance"},
		{"Sci-Fi"}, {"Mystery"}, {"Horror"}, {"Comedy"},
		{"Drama"}, {"Slice of Life"}, {"Martial Arts"}, {"Supernatural"},
	}

	genreIDs := make(map[string]uuid.UUID)
	for _, g := range genres {
		id := uuid.New()
		s := slug.Make(g.Name)
		_, err := tx.Exec(
			"INSERT INTO genres (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
			id, g.Name, s,
		)
		if err != nil {
			log.Printf("Genre seed error: %v", err)
		}
		genreIDs[g.Name] = id
	}

	warnings := []struct {
		Name string
	}{
		{"Graphic Violence"},
		{"Strong Language"},
		{"Sexual Content"},
		{"Self Harm"},
		{"Abuse"},
		{"Drug Use"},
	}

	for _, warning := range warnings {
		id := uuid.New()
		s := slug.Make(warning.Name)
		_, err := tx.Exec(
			"INSERT INTO content_warnings (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
			id, warning.Name, s,
		)
		if err != nil {
			log.Printf("Content warning seed error: %v", err)
		}
	}

	// Seed novels
	novels := []struct {
		Title       string
		Author      string
		Description string
		CoverURL    string
		Status      string
		Language    string
		NovelType   string
		Genres      []string
	}{
		{
			Title:       "The Celestial Throne",
			Author:      "Azure Phoenix",
			Description: "In a world where cultivation determines destiny, a young orphan discovers an ancient technique that could reshape the heavens. Follow Lin Wei as he ascends from the lowest sect to challenge the very gods themselves. With each breakthrough, the stakes grow higher and the enemies more formidable. Will he achieve immortality, or will the celestial tribulation consume him?",
			CoverURL:    "/covers/celestial-throne.jpg",
			Status:      "ongoing",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Action", "Fantasy", "Martial Arts"},
		},
		{
			Title:       "Digital Overlord",
			Author:      "NightCode",
			Description: "When the world's most advanced VRMMO merges with reality, programmer Alex Chen finds himself wielding admin privileges in a world gone mad. Monsters roam city streets, skill trees replace education, and death is no longer permanent—it's just expensive. As factions form and wars ignite, Alex must decide: save the old world or rule the new one.",
			CoverURL:    "/covers/digital-overlord.jpg",
			Status:      "ongoing",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Action", "Sci-Fi", "Adventure"},
		},
		{
			Title:       "Moonlit Serenade",
			Author:      "Sakura Dreams",
			Description: "A classical pianist who's lost her passion crosses paths with a street musician playing under the moonlight. In a city that never sleeps, two melodies intertwine into a symphony of love, loss, and rediscovery. But when her past catches up and his secrets surface, can their duet survive the dissonance?",
			CoverURL:    "/covers/moonlit-serenade.jpg",
			Status:      "completed",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Romance", "Drama", "Slice of Life"},
		},
		{
			Title:       "Abyss Walker",
			Author:      "DarkTide",
			Description: "Beneath the surface world lies the Abyss—an ever-shifting labyrinth of nightmares. Kael, a disgraced knight, descends into its depths seeking redemption. Each floor tests not just strength but sanity. The deeper he goes, the more he realizes: the Abyss isn't just a dungeon—it's alive, and it's been waiting for him.",
			CoverURL:    "/covers/abyss-walker.jpg",
			Status:      "ongoing",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Fantasy", "Adventure", "Horror"},
		},
		{
			Title:       "Reborn as a Side Character",
			Author:      "MetaWriter",
			Description: "After dying in a truck accident (naturally), office worker Tanaka Shou wakes up in his favorite novel—as the side character destined to die in chapter 47. Armed with knowledge of the plot and zero combat skills, he has to rewrite his fate without derailing the protagonist's story. Easier said than done when the protagonist is an idiot.",
			CoverURL:    "/covers/reborn-side-character.jpg",
			Status:      "ongoing",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Comedy", "Fantasy", "Adventure"},
		},
		{
			Title:       "Shadows of the Forgotten",
			Author:      "MistWeaver",
			Description: "In a kingdom plagued by a curse that erases memories, detective Lira must solve murders no one remembers committing. Each case peels back layers of a conspiracy reaching the throne itself. But as she digs deeper, her own memories begin to fade—and she starts finding her name in the case files.",
			CoverURL:    "/covers/shadows-forgotten.jpg",
			Status:      "ongoing",
			Language:    "en",
			NovelType:   "web_novel",
			Genres:      []string{"Mystery", "Fantasy", "Supernatural"},
		},
		{
			Title:       "සඳ එළියේ ගමන",
			Author:      "නීලා සෙවනැලි",
			Description: "දුර ගමේ සිට නගරයට පැමිණෙන තරුණියකගේ ජීවිතය, ආදරය, බලාපොරොත්තු සහ නැවත නැගී සිටීම ගැන කියන සිංහල වෙබ් නවකතාවක්.",
			CoverURL:    "",
			Status:      "ongoing",
			Language:    "si",
			NovelType:   "web_novel",
			Genres:      []string{"Drama", "Romance", "Slice of Life"},
		},
	}

	for _, n := range novels {
		novelID := uuid.New()
		novelSlug := slug.Make(n.Title)
		_, err := tx.Exec(
			`INSERT INTO novels (id, title, slug, author, description, cover_url, status, language, novel_type, chapter_count)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			novelID, n.Title, novelSlug, n.Author, n.Description, n.CoverURL, n.Status, n.Language, n.NovelType, 5,
		)
		if err != nil {
			log.Printf("Novel seed error: %v", err)
			continue
		}

		// Link genres
		for _, gName := range n.Genres {
			if gID, ok := genreIDs[gName]; ok {
				tx.Exec(
					"INSERT INTO novel_genres (novel_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
					novelID, gID,
				)
			}
		}

		// Create sample chapters
		chapterTitles := []string{
			"The Beginning",
			"First Steps",
			"Unexpected Encounter",
			"Rising Tension",
			"The Turning Point",
		}
		for i, ct := range chapterTitles {
			chapID := uuid.New()
			content := generateSampleContent(n.Title, i+1, ct, n.Language)
			tx.Exec(
				`INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				chapID, novelID, i+1, ct, content, len(content)/5,
			)
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Seed commit error: %v", err)
		return
	}

	log.Println("✅ Seed data inserted successfully")
}

func generateSampleContent(novelTitle string, chapterNum int, chapterTitle, language string) string {
	if language == "si" {
		sinhalaParagraphs := []string{
			"උදෑසන හිරු එළිය පරණ වත්ත පුරා පැතිර යද්දී, අලුත් දවසක් අරඹන ශබ්දය ගම පුරා පැතිරිණි. සුළඟත් එක්ක බලාපොරොත්තුත් නිහඬව ගමන් කළා.",
			"අද කියන එක හෙට වෙනස් වෙන්න පුළුවන් ලෝකයක, ඇය ගත් සෑම තීරණයක්ම හදවතට බරක් වුණා. ඒත් ආපසු හැරෙන්න ඉඩක් තිබුණේ නැහැ.",
			"කොළඹ නගරයේ විදුලි ආලෝක අතර මැවුණු හීන, ගමේ නිහඬ අහස යට පෝෂණය වෙච්ච හීනවලට වඩා වෙනස් වුණත්, ඒ දෙකේම අරුත සෙවීම ඇය නවත්තලා නැහැ.",
			"කෙනෙකුට කෙනෙකු හමුවීම හැම වෙලාවෙම අහම්බයක් නෙවෙයි. සමහර හමුවීම් ජීවිතේම දිශාව වෙනස් කරනවා.",
		}

		content := ""
		for _, paragraph := range sinhalaParagraphs {
			content += "<p>" + paragraph + "</p>\n\n"
		}
		return content
	}

	paragraphs := []string{
		"The morning sun cast long shadows across the ancient courtyard, its golden light filtering through the leaves of the centuries-old banyan tree that stood sentinel at the entrance. Birds sang their dawn chorus, oblivious to the weight of destiny that hung in the air like morning mist.",
		"Silence stretched between them, thick and unyielding. Neither dared to speak first, for words once spoken could never be retrieved—much like arrows loosed from a bow. The tension was palpable, a living thing that coiled around them both.",
		"The path ahead wound through a dense forest, where ancient trees formed a canopy so thick that sunlight barely penetrated to the mossy floor below. Strange sounds echoed from the depths—calls of creatures that had no names in any human tongue.",
		"Power surged through every fiber of their being, raw and untamed. It was like holding lightning in bare hands—exhilarating and terrifying in equal measure. One wrong move, one moment of lost concentration, and it would all come crashing down.",
		"The marketplace buzzed with activity. Merchants hawked their wares in a dozen different languages, while the aroma of exotic spices mingled with the less pleasant odors of too many people in too small a space. Somewhere, a street musician played a haunting melody on a worn-out lute.",
		"Night fell like a curtain, swift and absolute. Stars emerged one by one, pinpricks of ancient light in an endless dark canvas. The moon hung low on the horizon, swollen and amber, casting the world in shades of silver and shadow.",
		"They ran. There was no dignity in it, no heroic last stand—just pure, animal survival instinct driving their legs forward through the undergrowth. Branches whipped at their faces, roots tried to snag their feet, and behind them, something massive crashed through the trees.",
		"The library stretched in every direction, shelves upon shelves of leather-bound tomes reaching up into shadows so high that the ceiling was invisible. Dust motes danced in beams of light from narrow windows, and the air smelled of old paper and forgotten knowledge.",
		"A single tear traced its way down a weathered cheek. Not from sadness—those tears had been spent long ago—but from a strange, unexpected hope that bloomed in the chest like the first flower of spring pushing through frozen earth.",
		"The sword gleamed in the firelight, its edge so fine it seemed to cut the very air. Runes etched along the blade pulsed with a soft blue luminescence, responding to the wielder's intent. This was no ordinary weapon—it was a promise forged in steel.",
		"Conversations drifted through the tavern like smoke, mingling and separating in unpredictable currents. Laughter erupted from one corner while heated whispers emanated from another. Every person here had a story, and most of those stories had teeth.",
		"The ritual circle hummed with energy, each carefully drawn sigil contributing its own frequency to the growing resonance. The air grew thick, charged with potential. This was the moment of convergence—the point where intention met manifestation.",
	}

	content := ""
	for i, p := range paragraphs {
		content += "<p>" + p + "</p>\n\n"
		if i%4 == 3 && i < len(paragraphs)-1 {
			content += "<p>* * *</p>\n\n"
		}
	}

	return content
}
