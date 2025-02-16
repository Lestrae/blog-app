
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supbaseClient";

function App() {
  const [session, setSession] = useState(null);
  const [articles, setArticles] = useState([]);
  const [newArticle, setNewArticle] = useState({ title: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchArticles = useCallback(async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error) setArticles(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) await fetchArticles();
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchArticles]);

  useEffect(() => {
    if (!session) return;
  
    const channel = supabase
      .channel("articles-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          // Add console.log for debugging
          console.log("Change received:", payload);
          if (payload.eventType === "INSERT") {
            setArticles(prev => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setArticles(prev => prev.map(article => 
              article.id === payload.new.id ? payload.new : article
            ));
          } else if (payload.eventType === "DELETE") {
            setArticles(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]); // Ensure session is in dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newArticle.title.trim()) return;
  
    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("articles")
          .update({
            ...newArticle,
            updated_at: new Date().toISOString(),
            user_id: session.user.id // Add this line
          })
          .eq("id", editingId)
          .eq("user_id", session.user.id); // Add this for RLS compliance
      
        if (error) throw error;
        setEditingId(null);
        setNewArticle({ title: "", description: "" });
      
      } else {
        const { data, error } = await supabase.from("articles").insert({
          ...newArticle,
          user_id: session.user.id,
          user_name: session.user.user_metadata.email,
          avatar: session.user.user_metadata.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
  
        if (error) throw error;
        setNewArticle({ title: "", description: "" });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      await supabase.from("articles").delete().eq("id", id);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-us", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 p-4 bg-black rounded shadow">
          <div>
            <p className="font-semibold">{session.user.user_metadata.email}</p>
            <button
              onClick={() => supabase.auth.signOut().then(() => setSession(null))}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Sign out
            </button>
          </div>
          <img
            src={session.user.user_metadata.avatar_url}
            alt="User avatar"
            className="w-10 h-10 rounded-full"
          />
        </div>

        <form onSubmit={handleSubmit} className="mb-8 bg-black p-4 rounded shadow">
          <input
            type="text"
            placeholder="Article Title"
            value={newArticle.title}
            onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
            className="w-full mb-2 p-2 border rounded text-pretty"
            required
          />
          <textarea
            placeholder="Article Content"
            value={newArticle.description}
            onChange={(e) => setNewArticle(prev => ({ ...prev, description: e.target.value }))}
            className="w-full mb-2 p-2 border rounded h-32"
            required
          />
          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewArticle({ title: "", description: "" });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingId ? "Update Article" : "Post Article"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} className="bg-black p-4 rounded shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={article.avatar}
                    alt="Author"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{article.user_name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(article.updated_at || article.created_at)}
                      {article.updated_at && " (edited)"}
                    </p>
                  </div>
                </div>
                {article.user_id === session.user.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(article.id);
                        setNewArticle({
                          title: article.title,
                          description: article.description,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">{article.title}</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {article.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
