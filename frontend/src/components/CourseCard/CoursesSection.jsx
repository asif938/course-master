import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getCourses } from "../../services/courses.api";
import CoursesFilters from "./CoursesFilters";
import CoursesGrid from "./CoursesGrid";
import CoursesPagination from "./CoursesPagination";

export default function CoursesSection() {
    const { user } = useSelector((state) => state.auth);
    const [courses, setCourses] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // query states
    const [page, setPage] = useState(1);
    const [limit] = useState(8);
    const [search, setSearch] = useState(""); // text in the search box
    const [appliedSearch, setAppliedSearch] = useState(""); // submitted search term
    const [sort, setSort] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    // debounced copies so we do not fire a request on every keystroke
    const [debouncedCategory, setDebouncedCategory] = useState("");
    const [debouncedTags, setDebouncedTags] = useState("");

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedCategory(category.trim());
            setDebouncedTags(tags.trim());
        }, 400);
        return () => clearTimeout(t);
    }, [category, tags]);

    // any filter change goes back to page 1
    useEffect(() => {
        setPage(1);
    }, [sort, debouncedCategory, debouncedTags, appliedSearch]);

    // single fetch effect; ignore stale responses
    useEffect(() => {
        let cancelled = false;

        const fetchCourses = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await getCourses({
                    page,
                    limit,
                    search: appliedSearch || undefined,
                    sort: sort || undefined,
                    category: debouncedCategory || undefined,
                    tags: debouncedTags || undefined,
                });
                if (cancelled) return;
                setCourses(res.data.courses || []);
                setTotalPages(res.data.totalPages || 1);
            } catch {
                if (!cancelled) setError("Failed to load courses");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchCourses();
        return () => {
            cancelled = true;
        };
    }, [page, limit, appliedSearch, sort, debouncedCategory, debouncedTags]);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setAppliedSearch(search.trim());
    };

    return (
        <div className="space-y-6">

            <CoursesFilters
                search={search} setSearch={setSearch}
                sort={sort} setSort={setSort}
                category={category} setCategory={setCategory}
                tags={tags} setTags={setTags}
                onSearchSubmit={onSearchSubmit}
            />

            {/* states */}
            {loading && (
                <div className="flex justify-center py-10">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && courses.length === 0 && (
                <div className="rounded-xl border border-primary/20 bg-base-200 p-6 text-center">
                    <h3 className="text-lg font-semibold text-primary">
                        No courses found
                    </h3>
                    <p className="mt-1 text-base-content/70">
                        Try adjusting your search or filters.
                    </p>
                </div>
            )}


            {!loading && !error && courses.length > 0 && (
                <>
                    <CoursesGrid courses={courses} />
                    {user?.role === "admin" && (
                        <div className="flex justify-center pt-4">
                            <Link
                                to="/admin/courses"
                                className="btn btn-primary btn-wide"
                            >
                                Manage Courses
                            </Link>
                        </div>
                    )}
                </>
            )}

            <CoursesPagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
            />
        </div>
    );
}
